from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.schemas.preferences import DeletePreferenceCommand, PreferenceCommand


MAX_PREFERENCES = 50
MEMORY_SYNC_LEASE_SECONDS = 300
MEMORY_SYNC_STATES = frozenset({"pending", "syncing", "synced", "not_configured", "reconciliation_required"})


def _collection(uid: str) -> Any:
    scope = hashlib.sha256(uid.encode("utf-8")).hexdigest()
    return get_firestore().collection("users").document(scope).collection("preferences")


def _digest(method: str, command: PreferenceCommand | DeletePreferenceCommand) -> str:
    payload = json.dumps({"method": method, **command.model_dump(mode="json")}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _valid_record(data: dict[str, Any], uid: str, preference_id: str) -> dict[str, Any]:
    version = data.get("version")
    updated = data.get("updated_at")
    if (
        data.get("owner_uid") != uid
        or isinstance(version, bool)
        or not isinstance(version, int)
        or version < 1
        or not isinstance(updated, datetime)
        or updated.tzinfo is None
        or data.get("status") not in {"ACTIVE", "REVOKED"}
    ):
        raise DomainError("DATA_UNAVAILABLE", "Preference data is invalid.", 503, True)
    if data["status"] == "ACTIVE":
        text = data.get("text")
        if not isinstance(text, str) or not 1 <= len(text) <= 200 or data.get("consent") is not True:
            raise DomainError("DATA_UNAVAILABLE", "Preference data is invalid.", 503, True)
    else:
        text = None
    sync = data.get("memory_sync")
    if sync is None:
        sync_status = "not_configured"
        cleanup_required = False
    elif (
        not isinstance(sync, dict)
        or isinstance(sync.get("version"), bool)
        or not isinstance(sync.get("version"), int)
        or sync.get("version") != version
        or sync.get("status") not in MEMORY_SYNC_STATES
        or ("cleanup_required" in sync and not isinstance(sync.get("cleanup_required"), bool))
    ):
        raise DomainError("DATA_UNAVAILABLE", "Preference sync data is invalid.", 503, True)
    else:
        sync_status = sync["status"]
        cleanup_required = sync.get("cleanup_required") is True
    return {
        "preference_id": preference_id,
        "text": text,
        "status": data["status"],
        "version": version,
        "updated_at": updated.isoformat(),
        "consent": data["status"] == "ACTIVE",
        "memory_bank_sync": {"status": sync_status, "version": version},
        "memory_bank_cleanup_required": cleanup_required,
    }


def list_preferences(uid: str) -> list[dict[str, Any]]:
    try:
        snapshots = list(_collection(uid).where("status", "==", "ACTIVE").limit(MAX_PREFERENCES + 1).stream())
        if len(snapshots) > MAX_PREFERENCES:
            raise DomainError("DATA_UNAVAILABLE", "Too many preferences to list safely.", 503, True)
        records = [_valid_record(snapshot.to_dict() or {}, uid, snapshot.id) for snapshot in snapshots]
        return sorted((item for item in records if item["status"] == "ACTIVE"), key=lambda item: item["updated_at"], reverse=True)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Preferences could not be loaded.", 503, True) from exc


def list_preferences_needing_memory_sync(uid: str, *, limit: int = 20) -> list[dict[str, Any]]:
    """Read a bounded owner-scoped outbox batch, including revoked records."""
    bounded_limit = max(1, min(limit, MAX_PREFERENCES))
    try:
        snapshots = list(_collection(uid).limit(MAX_PREFERENCES + 1).stream())
        if len(snapshots) > MAX_PREFERENCES:
            raise DomainError("DATA_UNAVAILABLE", "Too many preferences to reconcile safely.", 503, True)
        records = [_valid_record(snapshot.to_dict() or {}, uid, snapshot.id) for snapshot in snapshots]
        pending = [
            item
            for item in records
            if item["memory_bank_sync"]["status"] != "synced"
            or item["memory_bank_sync"]["version"] != item["version"]
        ]
        return sorted(pending, key=lambda item: item["updated_at"])[:bounded_limit]
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Preference sync queue could not be loaded.", 503, True) from exc


def get_preference_record(uid: str, preference_id: str) -> dict[str, Any] | None:
    """Read one owner-scoped canonical preference for post-retrieval checks."""
    try:
        snapshot = _collection(uid).document(preference_id).get()
        if not snapshot.exists:
            return None
        return _valid_record(snapshot.to_dict() or {}, uid, preference_id)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Preference data could not be rechecked.", 503, True) from exc


def change_preference(uid: str, preference_id: str, command: PreferenceCommand | DeletePreferenceCommand, *, delete: bool) -> dict[str, Any]:
    if not delete and not command.consent:
        raise DomainError("CONSENT_REQUIRED", "Choose remember before saving this preference.", 422)
    try:
        db = get_firestore()
        collection = _collection(uid)
        ref = collection.document(preference_id)
        digest = _digest("DELETE" if delete else "PUT", command)
        now = datetime.now(timezone.utc)

        @firestore.transactional
        def commit(transaction: Any) -> dict[str, Any]:
            snapshot = ref.get(transaction=transaction)
            prior = snapshot.to_dict() if snapshot.exists else None
            if prior:
                verified = _valid_record(prior, uid, preference_id)
                if prior.get("last_idempotency_key") == command.idempotency_key:
                    if prior.get("last_payload_hash") != digest:
                        raise DomainError("IDEMPOTENCY_CONFLICT", "This retry key was used for a different preference change.", 409)
                    return verified
            prior_version = prior.get("version") if prior else 0
            if prior_version != command.base_version or (delete and not prior):
                raise DomainError("PREFERENCE_CONFLICT", "The preference changed. Reload before editing it.", 409)
            if not delete and (not prior or prior.get("status") == "REVOKED"):
                active = list(collection.where("status", "==", "ACTIVE").limit(MAX_PREFERENCES).stream(transaction=transaction))
                if len(active) >= MAX_PREFERENCES:
                    raise DomainError("PREFERENCE_LIMIT", "The saved preference limit has been reached.", 429)
            version = prior_version + 1
            data = {
                "owner_uid": uid,
                "version": version,
                "status": "REVOKED" if delete else "ACTIVE",
                "consent": not delete,
                "text": None if delete else command.text,
                "updated_at": now,
                "last_idempotency_key": command.idempotency_key,
                "last_payload_hash": digest,
                "memory_sync": _pending_memory_sync(version, now, prior),
            }
            transaction.set(ref, data)
            return _valid_record(data, uid, preference_id)

        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The preference change could not be confirmed.", 503, True) from exc


def _pending_memory_sync(version: int, now: datetime, prior: dict[str, Any] | None) -> dict[str, Any]:
    """Carry an active lease forward so a newer save cannot race its provider call."""
    prior_sync = prior.get("memory_sync") if prior else None
    lease_token = None
    lease_expires_at = None
    cleanup_required = bool(
        isinstance(prior_sync, dict)
        and (
            prior_sync.get("cleanup_required") is True
            or prior_sync.get("status") in {"synced", "syncing", "pending", "reconciliation_required"}
        )
    )
    if isinstance(prior_sync, dict):
        prior_expiry = prior_sync.get("lease_expires_at")
        if (
            isinstance(prior_sync.get("lease_token"), str)
            and isinstance(prior_expiry, datetime)
            and prior_expiry > now
        ):
            lease_token = prior_sync["lease_token"]
            lease_expires_at = prior_expiry
    return {
        "version": version,
        "status": "pending",
        "lease_token": lease_token,
        "lease_expires_at": lease_expires_at,
        "cleanup_required": cleanup_required,
        "updated_at": now,
        "error_code": None,
    }


def claim_preference_memory_sync(uid: str, preference_id: str) -> dict[str, Any]:
    """Atomically claim the current preference's versioned sync outbox entry."""
    db = get_firestore()
    ref = _collection(uid).document(preference_id)
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def claim(transaction: Any) -> dict[str, Any]:
        snapshot = ref.get(transaction=transaction)
        if not snapshot.exists:
            raise DomainError("DATA_UNAVAILABLE", "Preference data is unavailable.", 503, True)
        data = snapshot.to_dict() or {}
        record = _valid_record(data, uid, preference_id)
        sync = data.get("memory_sync")
        if not isinstance(sync, dict):
            sync = _pending_memory_sync(record["version"], now, data)
        if sync.get("status") == "synced":
            return {"status": "synced", "record": record}
        expiry = sync.get("lease_expires_at")
        if isinstance(sync.get("lease_token"), str) and isinstance(expiry, datetime) and expiry > now:
            return {"status": "busy", "record": record}
        token = uuid.uuid4().hex
        transaction.update(
            ref,
            {
                "memory_sync": {
                    "version": record["version"],
                    "status": "syncing",
                    "lease_token": token,
                    "lease_expires_at": now + timedelta(seconds=MEMORY_SYNC_LEASE_SECONDS),
                    "cleanup_required": sync.get("cleanup_required") is True,
                    "updated_at": now,
                    "error_code": None,
                }
            },
        )
        record["memory_bank_sync"] = {"status": "syncing", "version": record["version"]}
        return {"status": "claimed", "token": token, "record": record}

    try:
        return claim(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Preference sync could not be claimed.", 503, True) from exc


def read_current_preference_for_memory_sync(
    uid: str, preference_id: str, version: int, lease_token: str
) -> dict[str, Any] | None:
    """Re-read canonical data immediately before an external provider mutation."""
    db = get_firestore()
    ref = _collection(uid).document(preference_id)

    @firestore.transactional
    def read(transaction: Any) -> dict[str, Any] | None:
        snapshot = ref.get(transaction=transaction)
        if not snapshot.exists:
            return None
        data = snapshot.to_dict() or {}
        record = _valid_record(data, uid, preference_id)
        sync = data.get("memory_sync") or {}
        if (
            record["version"] != version
            or sync.get("version") != version
            or sync.get("lease_token") != lease_token
            or not isinstance(sync.get("lease_expires_at"), datetime)
            or sync["lease_expires_at"] <= datetime.now(timezone.utc)
        ):
            return None
        return record

    try:
        return read(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Preference sync state could not be checked.", 503, True) from exc


def finish_preference_memory_sync(
    uid: str,
    preference_id: str,
    version: int,
    lease_token: str,
    status: str,
) -> bool:
    """Complete or fail an outbox item only while its lease/version is current."""
    if status not in {"synced", "reconciliation_required"}:
        raise ValueError("invalid memory sync completion status")
    db = get_firestore()
    ref = _collection(uid).document(preference_id)
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def finish(transaction: Any) -> bool:
        snapshot = ref.get(transaction=transaction)
        if not snapshot.exists:
            return False
        data = snapshot.to_dict() or {}
        record = _valid_record(data, uid, preference_id)
        sync = data.get("memory_sync") or {}
        if (
            record["version"] != version
            or sync.get("version") != version
            or sync.get("lease_token") != lease_token
            or not isinstance(sync.get("lease_expires_at"), datetime)
            or sync["lease_expires_at"] <= now
        ):
            return False
        transaction.update(
            ref,
            {
                "memory_sync": {
                    "version": version,
                    "status": status,
                    "lease_token": None,
                    "lease_expires_at": None,
                    "cleanup_required": status == "reconciliation_required",
                    "updated_at": now,
                    "error_code": None if status == "synced" else "provider_error",
                }
            },
        )
        return True

    try:
        return finish(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Preference sync state could not be saved.", 503, True) from exc


def mark_preference_memory_sync_not_configured(uid: str, preference_id: str) -> str:
    """Persist disabled state unless another request currently owns the lease."""
    db = get_firestore()
    ref = _collection(uid).document(preference_id)
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def mark(transaction: Any) -> str:
        snapshot = ref.get(transaction=transaction)
        if not snapshot.exists:
            return "unavailable"
        data = snapshot.to_dict() or {}
        record = _valid_record(data, uid, preference_id)
        sync = data.get("memory_sync") or {}
        expiry = sync.get("lease_expires_at")
        if isinstance(sync.get("lease_token"), str) and isinstance(expiry, datetime) and expiry > now:
            return "pending"
        cleanup_required = sync.get("cleanup_required") is True or sync.get("status") in {
            "synced", "syncing", "pending", "reconciliation_required"
        }
        status = "reconciliation_required" if cleanup_required else "not_configured"
        transaction.update(
            ref,
            {
                "memory_sync": {
                    "version": record["version"],
                    "status": status,
                    "lease_token": None,
                    "lease_expires_at": None,
                    "cleanup_required": cleanup_required,
                    "updated_at": now,
                    "error_code": None,
                }
            },
        )
        return status

    try:
        return mark(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Preference sync state could not be saved.", 503, True) from exc
