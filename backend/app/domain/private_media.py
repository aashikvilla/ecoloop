from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

import firebase_admin
from firebase_admin import storage

from app.core.config import settings
from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal


MAX_MEDIA_BYTES = min(settings.MAX_REQUEST_BYTES, settings.MAX_PHOTO_BYTES)
MEDIA_TTL = timedelta(hours=24)
MEDIA_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MEDIA_SIGNATURES = {
    "image/jpeg": lambda value: value.startswith(b"\xff\xd8\xff"),
    "image/png": lambda value: value.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda value: len(value) >= 12 and value[:4] == b"RIFF" and value[8:12] == b"WEBP",
}
_BUCKET_NAME = re.compile(r"^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _bucket() -> Any:
    # The bucket is intentionally process-configured, not inferred from an
    # object path supplied by a caller or from a permissive default bucket.
    bucket_name = os.environ.get("PRIVATE_MEDIA_BUCKET", "").strip()
    project_id = (settings.FIREBASE_PROJECT_ID or settings.GOOGLE_CLOUD_PROJECT or "").strip()
    if not bucket_name or not _BUCKET_NAME.fullmatch(bucket_name) or not project_id:
        raise DomainError("PRIVATE_MEDIA_UNAVAILABLE", "Private media storage is not configured.", 503, True)
    try:
        app = firebase_admin.get_app()
        if app.project_id != project_id:
            raise DomainError("PRIVATE_MEDIA_UNAVAILABLE", "Private media storage identity is not configured.", 503, True)
        return storage.bucket(bucket_name, app=app)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("PRIVATE_MEDIA_UNAVAILABLE", "Private media storage is unavailable.", 503, True) from exc


def validate_media(image_bytes: bytes, mime_type: str) -> None:
    if not image_bytes:
        raise DomainError("EMPTY_MEDIA", "Choose a non-empty image.", 422)
    if len(image_bytes) > MAX_MEDIA_BYTES:
        raise DomainError("PAYLOAD_TOO_LARGE", "The image exceeds the supported size.", 413)
    signature_check = MEDIA_SIGNATURES.get(mime_type)
    if mime_type not in MEDIA_CONTENT_TYPES or signature_check is None or not signature_check(image_bytes):
        raise DomainError("UNSUPPORTED_MEDIA", "Choose a valid JPEG, PNG, or WebP image.", 422)


def _media_collection(principal: Principal) -> Any:
    return (
        get_firestore()
        .collection("households")
        .document(principal.household_id)
        .collection("private_media")
    )


def _assert_current_member(principal: Principal) -> None:
    try:
        snapshot = (
            get_firestore()
            .collection("households")
            .document(principal.household_id)
            .collection("members")
            .document(principal.uid)
            .get()
        )
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Household access could not be verified.", 503, True) from exc
    data = snapshot.to_dict() if snapshot.exists else None
    if (
        not data
        or data.get("uid") != principal.uid
        or data.get("status") != "ACTIVE"
        or data.get("role") != principal.role
    ):
        raise DomainError("FORBIDDEN", "The requested household membership is not available.", 403)


def _owned_record(principal: Principal, media_id: str) -> tuple[Any, dict[str, Any]]:
    _assert_current_member(principal)
    ref = _media_collection(principal).document(media_id)
    try:
        snapshot = ref.get()
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Private media metadata is unavailable.", 503, True) from exc
    record = snapshot.to_dict() if snapshot.exists else None
    if (
        not record
        or record.get("owner_uid") != principal.uid
        or record.get("household_id") != principal.household_id
    ):
        raise DomainError("NOT_FOUND", "The requested private media record was not found.", 404)
    return ref, record


def _public_record(media_id: str, record: dict[str, Any]) -> dict[str, Any]:
    return {
        "media_id": media_id,
        "content_type": record["content_type"],
        "size_bytes": record["size_bytes"],
        "created_at": record["created_at"],
        "expires_at": record["expires_at"],
        "state": record["state"],
    }


def create_private_media(
    principal: Principal,
    image_bytes: bytes,
    mime_type: str,
    idempotency_key: str,
) -> dict[str, Any]:
    validate_media(image_bytes, mime_type)
    _assert_current_member(principal)
    fingerprint = idempotency_fingerprint(image_bytes, mime_type, principal, idempotency_key)
    media_id = hashlib.sha256(
        f"{principal.household_id}\0{principal.uid}\0{idempotency_key}".encode("utf-8")
    ).hexdigest()[:32]
    collection = _media_collection(principal)
    ref = collection.document(media_id)
    try:
        existing = ref.get()
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Private media metadata is unavailable.", 503, True) from exc
    if existing.exists:
        record = existing.to_dict() or {}
        if record.get("request_fingerprint") != fingerprint:
            raise DomainError("IDEMPOTENCY_CONFLICT", "This upload key was already used for different image content.", 409)
        return _public_record(media_id, record)

    bucket = _bucket()
    object_name = f"households/{principal.household_id}/owners/{principal.uid}/{media_id}-{uuid4().hex}"
    created_at = _now()
    record = {
        "owner_uid": principal.uid,
        "household_id": principal.household_id,
        "object_name": object_name,
        "content_type": mime_type,
        "size_bytes": len(image_bytes),
        "created_at": created_at,
        "expires_at": created_at + MEDIA_TTL,
        "state": "ACTIVE",
        "request_fingerprint": fingerprint,
    }
    # Object names are generated only by the server. A failed metadata write
    # triggers best-effort cleanup, while never returning a storage path.
    try:
        blob = bucket.blob(object_name)
        blob.upload_from_string(image_bytes, content_type=mime_type, if_generation_match=0)
    except Exception as exc:
        raise DomainError("PRIVATE_MEDIA_UNAVAILABLE", "Private media could not be stored.", 503, True) from exc

    try:
        _assert_current_member(principal)
        ref.create(record)
    except DomainError:
        try:
            blob.delete()
        except Exception:
            pass
        raise
    except Exception as exc:
        try:
            blob.delete()
        except Exception:
            pass
        raise DomainError("DATA_UNAVAILABLE", "Private media metadata could not be saved.", 503, True) from exc
    return _public_record(media_id, record)


def read_private_media(principal: Principal, media_id: str) -> dict[str, Any]:
    ref, record = _owned_record(principal, media_id)
    if record.get("state") == "ACTIVE" and record.get("expires_at") <= _now():
        try:
            ref.update({"state": "EXPIRED", "expired_at": _now()})
        except Exception as exc:
            raise DomainError("DATA_UNAVAILABLE", "Private media expiry could not be recorded.", 503, True) from exc
        record["state"] = "EXPIRED"
    return _public_record(media_id, record)


def delete_private_media(principal: Principal, media_id: str) -> dict[str, Any]:
    ref, record = _owned_record(principal, media_id)
    state = record.get("state")
    if state == "DELETED":
        return _public_record(media_id, record)
    try:
        ref.update({"state": "DELETE_PENDING", "delete_requested_at": _now()})
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Private media deletion could not be recorded.", 503, True) from exc

    bucket = _bucket()
    try:
        bucket.blob(record["object_name"]).delete()
    except Exception as exc:
        # DELETE_PENDING blocks future use; the caller can retry deletion.
        raise DomainError("PRIVATE_MEDIA_DELETE_PENDING", "Private media deletion is pending. Retry later.", 503, True) from exc
    deleted_at = _now()
    try:
        ref.update({"state": "DELETED", "deleted_at": deleted_at})
    except Exception as exc:
        # The object is gone; fail closed by returning pending and reconcile on retry.
        raise DomainError("DATA_UNAVAILABLE", "Private media was removed; its status update is pending.", 503, True) from exc
    record["state"] = "DELETED"
    record["deleted_at"] = deleted_at
    return _public_record(media_id, record)


def idempotency_fingerprint(image_bytes: bytes, mime_type: str, principal: Principal, key: str) -> str:
    scope = f"{principal.household_id}\0{principal.uid}\0{key}\0{mime_type}\0".encode("utf-8")
    return hashlib.sha256(scope + image_bytes).hexdigest()
