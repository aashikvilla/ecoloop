from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import organization_membership_document_id
from app.schemas.recipient import OrganizationProfileUpdate


def _hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()


def _idempotency_ref(db: Any, uid: str, key: str) -> Any:
    actor = hashlib.sha256(uid.encode()).hexdigest()[:24]
    return db.collection("recipient_profile_idempotency").document(f"{actor}_{key}")


def _profile_view(org_id: str, organization: dict[str, Any]) -> dict[str, Any]:
    return {
        "org_id": org_id,
        "type": "recipient_org",
        "name": organization.get("name"),
        "category": organization.get("category"),
        "verification_status": organization.get("verification_status"),
        "profile_status": organization.get("profile_status", "INCOMPLETE"),
        "pickup_base": organization.get("pickup_base"),
        "service_radius_km": organization.get("service_radius_km", 5.0),
        "version": organization.get("version"),
        "updated_at": organization.get("updated_at"),
    }


def read_organization_profile(org_id: str, uid: str) -> dict[str, Any]:
    """Read an onboarding profile after verifying this UID's active membership."""
    from app.domain.recipient_access import require_active_profile_member

    db = get_firestore()
    try:
        organization, _membership = require_active_profile_member(db, org_id, uid)
        return _profile_view(org_id, organization)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The organization profile could not be read.", 503, True) from exc


def update_organization_profile(
    org_id: str,
    uid: str,
    command: OrganizationProfileUpdate,
    idempotency_key: str,
) -> dict[str, Any]:
    """Explicitly complete/update a recipient profile without changing verification state."""
    db = get_firestore()
    org_ref = db.collection("organizations").document(org_id)
    member_ref = db.collection("organization_members").document(organization_membership_document_id(org_id, uid))
    idem_ref = _idempotency_ref(db, uid, f"{org_id}_{idempotency_key}")
    fingerprint = _hash({"org_id": org_id, **command.model_dump(mode="json")})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        member_snapshot = member_ref.get(transaction=transaction)
        membership = member_snapshot.to_dict() if member_snapshot.exists else None
        snapshot = org_ref.get(transaction=transaction)
        organization = snapshot.to_dict() if snapshot.exists else None
        if (
            not organization or organization.get("org_id") != org_id or organization.get("type") != "recipient_org"
            or not membership or membership.get("org_id") != org_id or membership.get("uid") != uid
            or membership.get("status") != "ACTIVE"
        ):
            raise DomainError("FORBIDDEN", "The requested organization membership is not available.", 403)
        if organization.get("verification_status") == "REVOKED":
            raise DomainError("FORBIDDEN", "This organization is not available.", 403)

        idem_snapshot = idem_ref.get(transaction=transaction)
        if idem_snapshot.exists:
            prior = idem_snapshot.to_dict() or {}
            if prior.get("actor_uid") != uid or prior.get("payload_hash") != fingerprint:
                raise DomainError("IDEMPOTENCY_CONFLICT", "This request key was already used for another command.", 409)
            saved = prior.get("result")
            if isinstance(saved, dict):
                return saved
            raise DomainError("DATA_UNAVAILABLE", "The saved profile update is unavailable.", 503, True)

        version = organization.get("version", 1)
        if isinstance(version, bool) or not isinstance(version, int) or version < 1:
            raise DomainError("DATA_UNAVAILABLE", "The stored profile version is invalid.", 503, True)
        if version != command.expected_version:
            raise DomainError("PROFILE_VERSION_CONFLICT", "The profile changed. Reload it before saving.", 409)
        patch = {
            "name": command.name,
            "category": command.category,
            "pickup_base": command.pickup_base.model_dump(mode="json"),
            "service_radius_km": command.service_radius_km,
            "profile_status": "COMPLETE",
            "version": version + 1,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        updated = {**organization, **patch, "updated_at": now}
        result = _profile_view(org_id, updated)
        transaction.update(org_ref, patch)
        transaction.create(idem_ref, {
            "actor_uid": uid,
            "payload_hash": fingerprint,
            "result": result,
            "created_at": firestore.SERVER_TIMESTAMP,
        })
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The organization profile could not be saved.", 503, True) from exc
