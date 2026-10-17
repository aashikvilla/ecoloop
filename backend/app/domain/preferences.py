from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.schemas.preferences import DeletePreferenceCommand, PreferenceCommand


MAX_PREFERENCES = 50


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
    return {
        "preference_id": preference_id,
        "text": text,
        "status": data["status"],
        "version": version,
        "updated_at": updated.isoformat(),
        "consent": data["status"] == "ACTIVE",
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
            }
            transaction.set(ref, data)
            return _valid_record(data, uid, preference_id)

        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The preference change could not be confirmed.", 503, True) from exc
