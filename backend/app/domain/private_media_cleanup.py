"""Bounded, retryable cleanup for expired server-owned private media."""

from __future__ import annotations

import base64
import re
from datetime import datetime, timezone
from typing import Any, TypedDict

from firebase_admin import firestore
from google.api_core.exceptions import NotFound
from google.cloud.firestore_v1.field_path import FieldPath


DEFAULT_BATCH_SIZE = 100
MAX_BATCH_SIZE = 500
_MEDIA_OBJECT_SUFFIX = re.compile(r"^([a-f0-9]{32})-([a-f0-9]{32})$")
_HOUSEHOLD_ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
_OWNER_UID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")
_MEDIA_DOCUMENT_PATH = re.compile(r"^households/([A-Za-z0-9_-]{1,128})/private_media/([a-f0-9]{32})$")


class CleanupResult(TypedDict):
    scanned: int
    deleted: int
    pending: int
    skipped: int
    next_cursor: str | None


def _decode_cursor(db: Any, cursor: str | None, cutoff: datetime) -> Any | None:
    if cursor is None:
        return None
    try:
        if len(cursor) > 512 or re.fullmatch(r"[A-Za-z0-9_-]+", cursor) is None:
            raise ValueError("invalid cursor")
        path = base64.urlsafe_b64decode(cursor.encode("ascii") + b"=" * (-len(cursor) % 4)).decode("ascii")
        match = _MEDIA_DOCUMENT_PATH.fullmatch(path)
        if match is None:
            raise ValueError("invalid cursor")
        snapshot = db.document(path).get()
        data = snapshot.to_dict() if snapshot.exists else None
        expires_at = data.get("expires_at") if data else None
        if (
            snapshot.reference.parent.id != "private_media"
            or snapshot.reference.parent.parent.id != match.group(1)
            or snapshot.id != match.group(2)
            or not isinstance(expires_at, datetime)
            or expires_at > cutoff
        ):
            raise ValueError("invalid cursor")
        return snapshot
    except Exception as exc:
        raise ValueError("cursor must be an expired private-media row from this project") from exc


def _encode_cursor(snapshot: Any) -> str:
    return base64.urlsafe_b64encode(snapshot.reference.path.encode("ascii")).decode("ascii").rstrip("=")


def _owned_object_name(snapshot: Any, record: dict[str, Any]) -> str | None:
    """Accept only the path shape emitted by private_media.create_private_media."""
    object_name = record.get("object_name")
    household_id = record.get("household_id")
    owner_uid = record.get("owner_uid")
    if (
        not isinstance(object_name, str)
        or not isinstance(household_id, str)
        or not isinstance(owner_uid, str)
        or _HOUSEHOLD_ID.fullmatch(household_id) is None
        or _OWNER_UID.fullmatch(owner_uid) is None
    ):
        return None
    media_id = snapshot.id
    if (
        snapshot.reference.parent.id != "private_media"
        or snapshot.reference.parent.parent.id != household_id
    ):
        return None
    prefix = f"households/{household_id}/owners/{owner_uid}/"
    suffix = _MEDIA_OBJECT_SUFFIX.fullmatch(object_name[len(prefix) :]) if object_name.startswith(prefix) else None
    if suffix is None or suffix.group(1) != media_id:
        return None
    return object_name


def _claim_for_deletion(db: Any, snapshot: Any, cutoff: datetime) -> str | None:
    """Atomically claim an expired record; concurrent changes fail closed."""
    transaction = db.transaction()

    @firestore.transactional
    def claim(tx: Any) -> str | None:
        current = snapshot.reference.get(transaction=tx)
        if not current.exists:
            return None
        record = current.to_dict() or {}
        if record.get("state") not in {"ACTIVE", "EXPIRED", "DELETE_PENDING"}:
            return None
        expires_at = record.get("expires_at")
        if not isinstance(expires_at, datetime) or expires_at > cutoff:
            return None
        object_name = _owned_object_name(current, record)
        if object_name is None:
            return None
        if record.get("state") != "DELETE_PENDING":
            tx.update(snapshot.reference, {"state": "DELETE_PENDING", "delete_requested_at": cutoff})
        return object_name

    return claim(transaction)


def _mark_deleted(db: Any, snapshot: Any, object_name: str, now: datetime) -> bool:
    """Finish only if the claimed object path is still attached to this record."""
    transaction = db.transaction()

    @firestore.transactional
    def finish(tx: Any) -> bool:
        current = snapshot.reference.get(transaction=tx)
        if not current.exists:
            return False
        record = current.to_dict() or {}
        if record.get("object_name") != object_name:
            return False
        if record.get("state") == "DELETED":
            return True
        if record.get("state") != "DELETE_PENDING":
            return False
        tx.update(snapshot.reference, {"state": "DELETED", "deleted_at": now})
        return True

    return finish(transaction)


def cleanup_expired_private_media(
    db: Any,
    bucket: Any,
    *,
    now: datetime | None = None,
    limit: int = DEFAULT_BATCH_SIZE,
    cursor: str | None = None,
) -> CleanupResult:
    """Delete at most ``limit`` expired objects and safely advance their metadata.

    A later invocation retries ``DELETE_PENDING`` records after transient storage
    failures. Malformed or mismatched metadata is skipped without touching GCS.
    ``next_cursor`` advances through large result sets so bounded runs do not
    repeatedly scan only the oldest page.
    """
    if not 1 <= limit <= MAX_BATCH_SIZE:
        raise ValueError(f"limit must be between 1 and {MAX_BATCH_SIZE}")
    cutoff = now or datetime.now(timezone.utc)
    if cutoff.tzinfo is None:
        raise ValueError("now must be timezone-aware")

    query = (
        db.collection_group("private_media")
        .where("state", "in", ["ACTIVE", "EXPIRED", "DELETE_PENDING"])
        .where("expires_at", "<=", cutoff)
        .order_by("expires_at")
        .order_by(FieldPath.document_id())
    )
    cursor_snapshot = _decode_cursor(db, cursor, cutoff)
    if cursor_snapshot is not None:
        query = query.start_after(cursor_snapshot)
    snapshots = list(query.limit(limit + 1).stream())
    has_more = len(snapshots) > limit
    page = snapshots[:limit]
    counts: CleanupResult = {"scanned": 0, "deleted": 0, "pending": 0, "skipped": 0, "next_cursor": None}
    last_safe_snapshot = cursor_snapshot
    retry_cursor_snapshot = None
    retry_cursor_set = False
    for snapshot in page:
        counts["scanned"] += 1
        record = snapshot.to_dict() or {}
        object_name = _owned_object_name(snapshot, record)
        if object_name is None:
            counts["skipped"] += 1
            if not retry_cursor_set:
                retry_cursor_snapshot = last_safe_snapshot
                retry_cursor_set = True
            continue
        try:
            claimed_name = _claim_for_deletion(db, snapshot, cutoff)
            if claimed_name is None or claimed_name != object_name:
                current = snapshot.reference.get()
                current_record = current.to_dict() if current.exists else None
                current_expiry = current_record.get("expires_at") if current_record else None
                if current_record and current_record.get("state") in {"ACTIVE", "EXPIRED", "DELETE_PENDING"} and isinstance(current_expiry, datetime) and current_expiry <= cutoff:
                    counts["skipped"] += 1
                    if not retry_cursor_set:
                        retry_cursor_snapshot = last_safe_snapshot
                        retry_cursor_set = True
                    continue
                # Another worker completed or made the row ineligible after this page was read.
                last_safe_snapshot = snapshot
                continue
            try:
                bucket.blob(claimed_name).delete()
            except NotFound:
                # A previous attempt may have removed the object but failed to
                # persist DELETED; absence is the desired idempotent outcome.
                pass
            if _mark_deleted(db, snapshot, claimed_name, datetime.now(timezone.utc)):
                counts["deleted"] += 1
            else:
                counts["pending"] += 1
                if not retry_cursor_set:
                    retry_cursor_snapshot = last_safe_snapshot
                    retry_cursor_set = True
        except Exception:
            # Keep processing the bounded page. DELETE_PENDING is retryable.
            counts["pending"] += 1
            if not retry_cursor_set:
                retry_cursor_snapshot = last_safe_snapshot
                retry_cursor_set = True
        if not retry_cursor_set:
            last_safe_snapshot = snapshot
    if retry_cursor_set:
        if retry_cursor_snapshot is not None:
            counts["next_cursor"] = _encode_cursor(retry_cursor_snapshot)
    elif has_more and page:
        counts["next_cursor"] = _encode_cursor(page[-1])
    return counts
