from __future__ import annotations

from typing import Any

from app.core.errors import DomainError
from app.core.identity import ActorContext, organization_membership_document_id


RECIPIENT_OPERATOR_PERMISSIONS = (
    "profile:read", "profile:edit", "offer:search", "offer:claim", "claim:read",
    "claim:cancel", "claim:collect", "claim:receive", "route:read", "impact:read",
    "plan:create", "plan:edit",
)


def recipient_profile_complete(organization: dict[str, Any]) -> bool:
    status = organization.get("verification_status")
    if status not in {"PENDING", "APPROVED"}:
        return False
    legacy_approved = status == "APPROVED"
    if organization.get("profile_status") != "COMPLETE" and not legacy_approved:
        return False
    name = organization.get("name")
    category = organization.get("category")
    base = organization.get("pickup_base")
    radius = organization.get("service_radius_km", 5.0)
    if not isinstance(name, str) or len(name.strip()) < 2:
        return False
    if not isinstance(category, str) or len(category.strip()) < 2:
        return False
    if not isinstance(base, dict) or not isinstance(base.get("approximate_area"), str):
        return False
    latitude, longitude = base.get("latitude"), base.get("longitude")
    if isinstance(latitude, bool) or not isinstance(latitude, (int, float)) or not -90 <= latitude <= 90:
        return False
    if isinstance(longitude, bool) or not isinstance(longitude, (int, float)) or not -180 <= longitude <= 180:
        return False
    return not isinstance(radius, bool) and isinstance(radius, (int, float)) and 1 <= radius <= 20


def validate_recipient_membership(
    organization: dict[str, Any] | None,
    membership: dict[str, Any] | None,
    uid: str,
    org_id: str,
    expected_version: int | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    membership_version = membership.get("version") if membership else None
    if (
        not organization or organization.get("org_id") != org_id
        or organization.get("type") != "recipient_org"
        or not membership or membership.get("org_id") != org_id
        or membership.get("uid") != uid or membership.get("status") != "ACTIVE"
        or not isinstance(membership.get("role"), str) or not membership.get("role")
        or isinstance(membership_version, bool) or not isinstance(membership_version, int) or membership_version < 1
        or (expected_version is not None and membership.get("version") != expected_version)
    ):
        raise DomainError("FORBIDDEN", "The requested organization membership is not available.", 403)
    if organization.get("verification_status") not in {"PENDING", "APPROVED"}:
        raise DomainError("FORBIDDEN", "This organization is not currently available.", 403)
    if not recipient_profile_complete(organization):
        raise DomainError("PROFILE_INCOMPLETE", "Complete the organization profile before finding or collecting offers.", 403)
    return organization, membership


def assert_recipient_actor(transaction: Any, db: Any, actor: ActorContext, permission: str | None = None) -> dict[str, Any]:
    if actor.actor_kind != "recipient_org":
        raise DomainError("FORBIDDEN", "Only a recipient organization can use this action.", 403)
    organization_ref = db.collection("organizations").document(actor.actor_id)
    member_ref = db.collection("organization_members").document(organization_membership_document_id(actor.actor_id, actor.uid))
    organization_snapshot = organization_ref.get(transaction=transaction)
    member_snapshot = member_ref.get(transaction=transaction)
    organization = organization_snapshot.to_dict() if organization_snapshot.exists else None
    membership = member_snapshot.to_dict() if member_snapshot.exists else None
    organization, membership = validate_recipient_membership(
        organization, membership, actor.uid, actor.actor_id, actor.membership_version,
    )
    if membership.get("role") != actor.role:
        raise DomainError("FORBIDDEN", "The requested organization membership is not available.", 403)
    if permission and permission not in actor.permissions:
        raise DomainError("FORBIDDEN", "This organization action is not allowed.", 403)
    return organization


def require_active_profile_member(db: Any, org_id: str, uid: str) -> tuple[dict[str, Any], dict[str, Any]]:
    organization_snapshot = db.collection("organizations").document(org_id).get()
    member_snapshot = db.collection("organization_members").document(organization_membership_document_id(org_id, uid)).get()
    organization = organization_snapshot.to_dict() if organization_snapshot.exists else None
    membership = member_snapshot.to_dict() if member_snapshot.exists else None
    if (
        not organization or organization.get("org_id") != org_id
        or organization.get("type") != "recipient_org"
        or not membership or membership.get("org_id") != org_id
        or membership.get("uid") != uid or membership.get("status") != "ACTIVE"
    ):
        raise DomainError("FORBIDDEN", "The requested organization profile is not available.", 403)
    if organization.get("verification_status") not in {"PENDING", "APPROVED"}:
        raise DomainError("FORBIDDEN", "This organization is not currently available.", 403)
    return organization, membership


def require_donor_actor(
    transaction: Any, db: Any, actor: ActorContext, offer: dict[str, Any], permission: str,
) -> dict[str, Any] | None:
    donor = offer.get("donor") if isinstance(offer, dict) else None
    if not isinstance(donor, dict):
        raise DomainError("NOT_FOUND", "The offer was not found.", 404)
    if actor.actor_kind == "household":
        member_ref = db.collection("households").document(actor.actor_id).collection("members").document(actor.uid)
        snapshot = member_ref.get(transaction=transaction)
        member = snapshot.to_dict() if snapshot.exists else None
        version = member.get("version", 1) if member else None
        if (
            donor.get("kind") != "household" or donor.get("owner_id") != actor.actor_id
            or not member or member.get("uid") != actor.uid or member.get("status") != "ACTIVE"
            or member.get("role") != actor.role or version != actor.membership_version
            or permission not in actor.permissions
        ):
            raise DomainError("FORBIDDEN", "The requested donor membership is not available.", 403)
        return None
    if actor.actor_kind != "business" or donor.get("kind") != "business" or donor.get("owner_id") != actor.actor_id:
        raise DomainError("NOT_FOUND", "The offer was not found.", 404)
    organization_ref = db.collection("organizations").document(actor.actor_id)
    member_ref = db.collection("organization_members").document(organization_membership_document_id(actor.actor_id, actor.uid))
    organization_snapshot = organization_ref.get(transaction=transaction)
    member_snapshot = member_ref.get(transaction=transaction)
    organization = organization_snapshot.to_dict() if organization_snapshot.exists else None
    member = member_snapshot.to_dict() if member_snapshot.exists else None
    if (
        not organization or organization.get("type") != "business_donor"
        or organization.get("verification_status") != "APPROVED"
        or not member or member.get("uid") != actor.uid or member.get("status") != "ACTIVE"
        or member.get("version") != actor.membership_version or permission not in actor.permissions
    ):
        raise DomainError("FORBIDDEN", "The requested donor membership is not available.", 403)
    return organization
