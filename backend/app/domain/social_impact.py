from __future__ import annotations

import hashlib
import json
import re
import time
from datetime import datetime, timezone
from typing import Any

from google.api_core import exceptions as google_exceptions
from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import ActorContext, organization_membership_document_id
from app.schemas.social_impact import ClaimCreate, OfferEdit, OrganizationCreate


IDEMPOTENCY_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
PUBLIC_OFFER_FIELDS = (
    "offer_id", "title", "category", "tags", "donor", "quantity_total_minor",
    "quantity_available_minor", "quantity_reserved_minor", "quantity_collected_minor",
    "quantity_received_minor", "unit", "expiry_declaration", "expiry_at",
    "storage_declaration", "allergen_declaration", "pickup_window_start",
    "pickup_window_end", "approximate_area", "visibility", "status", "version", "created_at", "updated_at",
)


def _hash(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _stable_document_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("\0".join(parts).encode("utf-8")).hexdigest()
    return f"{prefix}_{digest}"


def _key_ref(db: Any, actor_uid: str, key: str) -> Any:
    scope = hashlib.sha256(actor_uid.encode("utf-8")).hexdigest()[:24]
    return db.collection("social_impact_idempotency").document(f"{scope}_{key}")


def _prior(snapshot: Any, fingerprint: str, uid: str) -> dict[str, Any] | None:
    if not snapshot.exists:
        return None
    value = snapshot.to_dict() or {}
    if value.get("actor_uid") != uid or value.get("payload_hash") != fingerprint:
        raise DomainError("IDEMPOTENCY_CONFLICT", "This request key was already used for another command.", 409)
    result = value.get("result")
    if not isinstance(result, dict):
        raise DomainError("DATA_UNAVAILABLE", "The saved command result is unavailable.", 503, True)
    return result


def _version(data: dict[str, Any]) -> int:
    value = data.get("version")
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise DomainError("DATA_UNAVAILABLE", "The stored version is invalid; reload or reconcile this record.", 503, True)
    return value


def _assert_actor(transaction: Any, db: Any, actor: ActorContext, required_permission: str | None = None) -> dict[str, Any] | None:
    if actor.actor_kind == "household":
        member_ref = db.collection("households").document(actor.actor_id).collection("members").document(actor.uid)
        snapshot = member_ref.get(transaction=transaction)
        member = snapshot.to_dict() if snapshot.exists else None
        current_version = (member or {}).get("version", 1)
        if (
            not member or member.get("uid") != actor.uid or member.get("status") != "ACTIVE"
            or member.get("role") != actor.role or isinstance(current_version, bool)
            or not isinstance(current_version, int) or current_version < 1 or current_version != actor.membership_version
        ):
            raise DomainError("FORBIDDEN", "The requested household membership is not available.", 403)
        if required_permission and required_permission not in actor.permissions:
            raise DomainError("FORBIDDEN", "This action is not allowed for the selected actor.", 403)
        return None

    org_ref = db.collection("organizations").document(actor.actor_id)
    member_ref = db.collection("organization_members").document(organization_membership_document_id(actor.actor_id, actor.uid))
    org_snapshot = org_ref.get(transaction=transaction)
    member_snapshot = member_ref.get(transaction=transaction)
    organization = org_snapshot.to_dict() if org_snapshot.exists else None
    member = member_snapshot.to_dict() if member_snapshot.exists else None
    expected_type = "business_donor" if actor.actor_kind == "business" else "recipient_org"
    if (
        not organization or organization.get("org_id") != actor.actor_id
        or organization.get("type") != expected_type or not member
        or member.get("org_id") != actor.actor_id or member.get("uid") != actor.uid
        or member.get("status") != "ACTIVE" or member.get("role") != actor.role
        or isinstance(member.get("version"), bool) or not isinstance(member.get("version"), int)
        or member.get("version") < 1 or member.get("version") != actor.membership_version
    ):
        raise DomainError("FORBIDDEN", "The requested organization membership is not available.", 403)
    if actor.actor_kind == "recipient_org" and organization.get("verification_status") != "APPROVED":
        raise DomainError("FORBIDDEN", "The recipient organization is not approved.", 403)
    permissions = member.get("permissions")
    if not isinstance(permissions, list) or any(not isinstance(item, str) for item in permissions):
        raise DomainError("DATA_UNAVAILABLE", "Organization permissions are invalid.", 503, True)
    if required_permission and required_permission not in permissions:
        raise DomainError("FORBIDDEN", "This action is not allowed for the selected actor.", 403)
    return organization


def create_organization(uid: str, command: OrganizationCreate, idempotency_key: str) -> dict[str, Any]:
    db = get_firestore()
    now = datetime.now(timezone.utc)
    org_ref = db.collection("organizations").document()
    member_ref = None
    idem_ref = _key_ref(db, uid, f"organization:{idempotency_key}")
    payload_hash = _hash(command.model_dump(mode="json"))
    verification = "PENDING"
    member_permissions = ["offer:create", "offer:edit", "offer:read", "offer:publish"] if command.type == "business_donor" else ["offer:search", "offer:claim"]

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        previous = _prior(idem_ref.get(transaction=transaction), payload_hash, uid)
        if previous is not None:
            return previous
        org_id = org_ref.id
        nonlocal member_ref
        member_ref = db.collection("organization_members").document(organization_membership_document_id(org_id, uid))
        record = {
            "org_id": org_id,
            "type": command.type,
            "name": command.name.strip(),
            "category": command.category.strip() if command.category else None,
            "verification_status": verification,
            "pickup_base": command.pickup_base.model_dump(mode="json") if command.pickup_base else None,
            "version": 1,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        membership = {
            "org_id": org_id,
            "uid": uid,
            "role": "ADMIN",
            "status": "ACTIVE",
            "permissions": member_permissions,
            "version": 1,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        result_membership = {
            key: value for key, value in membership.items() if key not in {"created_at", "updated_at"}
        } | {"created_at": now.isoformat(), "updated_at": now.isoformat()}
        result = {
            "organization": {**record, "created_at": now.isoformat(), "updated_at": now.isoformat()},
            "membership": result_membership,
        }
        transaction.create(org_ref, record)
        transaction.create(member_ref, membership)
        transaction.create(idem_ref, {"actor_uid": uid, "payload_hash": payload_hash, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The organization could not be created.", 503, True) from exc


def list_my_organizations(uid: str) -> dict[str, Any]:
    db = get_firestore()
    try:
        memberships = db.collection("organization_members").where("uid", "==", uid).where("status", "==", "ACTIVE").limit(50).stream()
        organizations: list[dict[str, Any]] = []
        for membership_snapshot in memberships:
            membership = membership_snapshot.to_dict() or {}
            org_id = membership.get("org_id")
            if not isinstance(org_id, str):
                continue
            snapshot = db.collection("organizations").document(org_id).get()
            organization = snapshot.to_dict() if snapshot.exists else None
            if not organization:
                continue
            organizations.append({
                "org_id": org_id,
                "type": organization.get("type"),
                "name": organization.get("name"),
                "verification_status": organization.get("verification_status"),
                "role": membership.get("role"),
                "permissions": membership.get("permissions", []),
                "membership_version": membership.get("version"),
            })
        return {"organizations": organizations}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Organizations could not be read.", 503, True) from exc


def _offer_ref(db: Any, offer_id: str) -> Any:
    return db.collection("surplus_offers").document(offer_id)


def create_offer(actor: ActorContext, title: str, category: str, idempotency_key: str) -> dict[str, Any]:
    if actor.actor_kind == "recipient_org":
        raise DomainError("FORBIDDEN", "Recipient organizations cannot create donor offers.", 403)
    db = get_firestore()
    now = datetime.now(timezone.utc)
    ref = db.collection("surplus_offers").document()
    idem_ref = _key_ref(db, actor.uid, f"offer-create:{idempotency_key}")
    payload_hash = _hash({"title": title, "category": category, "actor_id": actor.actor_id, "actor_kind": actor.actor_kind})

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_actor(transaction, db, actor, "offer:create")
        previous = _prior(idem_ref.get(transaction=transaction), payload_hash, actor.uid)
        if previous is not None:
            return previous
        donor_kind = "business" if actor.actor_kind == "business" else "household"
        result = {"offer_id": ref.id, "status": "DRAFT", "version": 1}
        record = {
            "offer_id": ref.id,
            "donor": {"kind": donor_kind, "owner_id": actor.actor_id, "creator_uid": actor.uid},
            "title": title.strip(),
            "category": category.strip(),
            "tags": [],
            "quantity_total_minor": None,
            "quantity_available_minor": None,
            "quantity_reserved_minor": 0,
            "quantity_collected_minor": 0,
            "quantity_received_minor": 0,
            "unit": None,
            "expiry_declaration": "UNKNOWN",
            "expiry_at": None,
            "storage_declaration": "UNKNOWN",
            "allergen_declaration": "UNKNOWN",
            "pickup_window_start": None,
            "pickup_window_end": None,
            "approximate_area": None,
            "exact_address": None,
            "latitude": None,
            "longitude": None,
            "pickup_instructions": None,
            "media_ids": [],
            "visibility": "PRIVATE",
            "status": "DRAFT",
            "version": 1,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        transaction.create(ref, record)
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": payload_hash, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The offer draft could not be created.", 503, True) from exc


def edit_offer(actor: ActorContext, offer_id: str, command: OfferEdit, idempotency_key: str) -> dict[str, Any]:
    if actor.actor_kind == "recipient_org":
        raise DomainError("FORBIDDEN", "Recipient organizations cannot edit donor offers.", 403)
    db = get_firestore()
    ref = _offer_ref(db, offer_id)
    idem_ref = _key_ref(db, actor.uid, f"offer-edit:{idempotency_key}")
    payload_hash = _hash({"offer_id": offer_id, **command.model_dump(mode="json")})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_actor(transaction, db, actor, "offer:edit")
        previous = _prior(idem_ref.get(transaction=transaction), payload_hash, actor.uid)
        if previous is not None:
            return previous
        snapshot = ref.get(transaction=transaction)
        offer = snapshot.to_dict() if snapshot.exists else None
        if not offer:
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        donor = offer.get("donor") or {}
        donor_kind = "business" if actor.actor_kind == "business" else "household"
        if donor.get("kind") != donor_kind or donor.get("owner_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        if offer.get("status") != "DRAFT":
            raise DomainError("OFFER_STATUS_CONFLICT", "Only a draft offer can be edited.", 409)
        if _version(offer) != command.expected_version:
            raise DomainError("OFFER_VERSION_CONFLICT", "The offer changed. Reload it before editing.", 409)
        patch = command.model_dump(exclude={"expected_version"})
        updated = {**offer, **patch, "quantity_available_minor": command.quantity_total_minor, "version": command.expected_version + 1, "updated_at": firestore.SERVER_TIMESTAMP}
        result = {"offer_id": offer_id, "status": "DRAFT", "version": command.expected_version + 1}
        transaction.set(ref, updated)
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": payload_hash, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The offer could not be updated.", 503, True) from exc


def publish_offer(actor: ActorContext, offer_id: str, expected_version: int, idempotency_key: str) -> dict[str, Any]:
    if actor.actor_kind == "recipient_org":
        raise DomainError("FORBIDDEN", "Recipient organizations cannot publish donor offers.", 403)
    db = get_firestore()
    ref = _offer_ref(db, offer_id)
    idem_ref = _key_ref(db, actor.uid, f"offer-publish:{idempotency_key}")
    payload_hash = _hash({"offer_id": offer_id, "expected_version": expected_version})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        organization = _assert_actor(transaction, db, actor, "offer:publish")
        previous = _prior(idem_ref.get(transaction=transaction), payload_hash, actor.uid)
        if previous is not None:
            return previous
        snapshot = ref.get(transaction=transaction)
        offer = snapshot.to_dict() if snapshot.exists else None
        if not offer:
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        donor = offer.get("donor") or {}
        donor_kind = "business" if actor.actor_kind == "business" else "household"
        if donor.get("kind") != donor_kind or donor.get("owner_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        if actor.actor_kind == "business" and (organization or {}).get("verification_status") != "APPROVED":
            raise DomainError("FORBIDDEN", "The business organization must be approved before publication.", 403)
        if offer.get("status") != "DRAFT":
            raise DomainError("OFFER_STATUS_CONFLICT", "Only a draft offer can be published.", 409)
        if _version(offer) != expected_version:
            raise DomainError("OFFER_VERSION_CONFLICT", "The offer changed. Reload it before publication.", 409)
        start, end = offer.get("pickup_window_start"), offer.get("pickup_window_end")
        required = [offer.get("quantity_total_minor"), offer.get("unit"), start, end, offer.get("approximate_area"), offer.get("exact_address"), offer.get("latitude"), offer.get("longitude")]
        if any(value is None for value in required):
            raise DomainError("PUBLICATION_INCOMPLETE", "Quantity, unit, pickup window and location declarations are required.", 422)
        if not isinstance(start, datetime) or not isinstance(end, datetime) or end <= now or end <= start:
            raise DomainError("INVALID_PICKUP_WINDOW", "The donor-declared pickup window is not valid.", 422)
        total = offer.get("quantity_total_minor")
        if isinstance(total, bool) or not isinstance(total, int) or total <= 0:
            raise DomainError("INVALID_QUANTITY", "A positive integer offer quantity is required.", 422)
        result = {"offer_id": offer_id, "status": "OPEN", "version": expected_version + 1}
        transaction.update(ref, {"visibility": "PUBLIC", "status": "OPEN", "version": expected_version + 1, "updated_at": firestore.SERVER_TIMESTAMP})
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": payload_hash, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The offer could not be published.", 503, True) from exc


def _public_offer(offer: dict[str, Any]) -> dict[str, Any]:
    result = {field: offer.get(field) for field in PUBLIC_OFFER_FIELDS if field in offer}
    donor = offer.get("donor")
    if isinstance(donor, dict):
        result["donor"] = {"kind": donor.get("kind")}
    return result


def _assert_actor_read(db: Any, actor: ActorContext, required_permission: str | None = None) -> dict[str, Any] | None:
    if actor.actor_kind == "household":
        snapshot = db.collection("households").document(actor.actor_id).collection("members").document(actor.uid).get()
        member = snapshot.to_dict() if snapshot.exists else None
        version = (member or {}).get("version", 1)
        if not member or member.get("uid") != actor.uid or member.get("status") != "ACTIVE" or member.get("role") != actor.role or isinstance(version, bool) or not isinstance(version, int) or version < 1 or version != actor.membership_version:
            raise DomainError("FORBIDDEN", "The requested household membership is not available.", 403)
        if required_permission and required_permission not in actor.permissions:
            raise DomainError("FORBIDDEN", "This action is not allowed for the selected actor.", 403)
        return None
    org_snapshot = db.collection("organizations").document(actor.actor_id).get()
    member_snapshot = db.collection("organization_members").document(organization_membership_document_id(actor.actor_id, actor.uid)).get()
    organization = org_snapshot.to_dict() if org_snapshot.exists else None
    member = member_snapshot.to_dict() if member_snapshot.exists else None
    expected_type = "business_donor" if actor.actor_kind == "business" else "recipient_org"
    member_version = (member or {}).get("version")
    if not organization or organization.get("org_id") != actor.actor_id or organization.get("type") != expected_type or not member or member.get("org_id") != actor.actor_id or member.get("uid") != actor.uid or member.get("status") != "ACTIVE" or member.get("role") != actor.role or isinstance(member_version, bool) or not isinstance(member_version, int) or member_version < 1 or member_version != actor.membership_version:
        raise DomainError("FORBIDDEN", "The requested organization membership is not available.", 403)
    if actor.actor_kind == "recipient_org" and organization.get("verification_status") != "APPROVED":
        raise DomainError("FORBIDDEN", "The recipient organization is not approved.", 403)
    permissions = member.get("permissions")
    if not isinstance(permissions, list) or any(not isinstance(item, str) for item in permissions):
        raise DomainError("DATA_UNAVAILABLE", "Organization permissions are invalid.", 503, True)
    if required_permission and required_permission not in permissions:
        raise DomainError("FORBIDDEN", "This action is not allowed for the selected actor.", 403)
    return organization


def _sanitize_offer(offer: dict[str, Any], include_private: bool = False) -> dict[str, Any]:
    output = _public_offer(offer)
    if include_private:
        output.update({key: offer.get(key) for key in ("exact_address", "pickup_instructions", "media_ids", "latitude", "longitude")})
    else:
        output.pop("media_ids", None)
    return output


def list_public_offers(actor: ActorContext) -> dict[str, Any]:
    if actor.actor_kind != "recipient_org":
        raise DomainError("FORBIDDEN", "Only approved recipient organizations can search offers.", 403)
    db = get_firestore()
    try:
        # Authorization and approval are rechecked before the query; no coordinates or private fields enter this response.
        _assert_actor_read(db, actor, "offer:search")
        results = db.collection("surplus_offers").where("visibility", "==", "PUBLIC").where("status", "==", "OPEN").order_by("created_at", direction=firestore.Query.DESCENDING).limit(50).stream()
        return {"offers": [_sanitize_offer(snapshot.to_dict() or {}) for snapshot in results]}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Offers could not be searched.", 503, True) from exc


def list_my_offers(actor: ActorContext) -> dict[str, Any]:
    if actor.actor_kind == "recipient_org":
        raise DomainError("FORBIDDEN", "Recipient organizations do not own donor offers.", 403)
    db = get_firestore()
    try:
        # This query is owner-scoped; actor membership is checked again before returning records.
        _assert_actor_read(db, actor, "offer:read")
        donor_kind = "business" if actor.actor_kind == "business" else "household"
        results = db.collection("surplus_offers").where("donor.kind", "==", donor_kind).where("donor.owner_id", "==", actor.actor_id).order_by("created_at", direction=firestore.Query.DESCENDING).limit(50).stream()
        return {"offers": [_sanitize_offer(snapshot.to_dict(), include_private=True) for snapshot in results]}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Offers could not be read.", 503, True) from exc


def read_offer(actor: ActorContext, offer_id: str) -> dict[str, Any]:
    db = get_firestore()
    try:
        snapshot = _offer_ref(db, offer_id).get()
        offer = snapshot.to_dict() if snapshot.exists else None
        if not offer:
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        donor = offer.get("donor") or {}
        donor_kind = "business" if actor.actor_kind == "business" else "household"
        if actor.actor_kind != "recipient_org" and donor.get("kind") == donor_kind and donor.get("owner_id") == actor.actor_id:
            _assert_actor_read(db, actor, "offer:read")
            return _sanitize_offer(offer, include_private=True)
        if offer.get("visibility") != "PUBLIC" or offer.get("status") not in {"OPEN", "PARTIALLY_RESERVED", "FULLY_RESERVED"}:
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        if actor.actor_kind != "recipient_org":
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        _assert_actor_read(db, actor, "offer:search")
        claim_ref = db.collection("offer_claims").document(_stable_document_id("claim", offer_id, actor.actor_id))
        claim_snapshot = claim_ref.get()
        claim = claim_snapshot.to_dict() if claim_snapshot.exists else None
        active_claim = claim and claim.get("status") in {"RESERVED", "PICKUP_IN_PROGRESS", "COLLECTED"}
        return _sanitize_offer(offer, include_private=bool(active_claim))
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The offer could not be read.", 503, True) from exc


def create_claim(actor: ActorContext, offer_id: str, command: ClaimCreate, idempotency_key: str) -> dict[str, Any]:
    if actor.actor_kind != "recipient_org":
        raise DomainError("FORBIDDEN", "Only approved recipient organizations can reserve offers.", 403)
    db = get_firestore()
    offer_ref = _offer_ref(db, offer_id)
    claim_ref = db.collection("offer_claims").document(_stable_document_id("claim", offer_id, actor.actor_id))
    event_ref = db.collection("pickup_events").document(_stable_document_id("event", offer_id, actor.actor_id, "reserved"))
    idem_ref = _key_ref(db, actor.uid, f"claim:{idempotency_key}")
    payload_hash = _hash({"offer_id": offer_id, **command.model_dump(mode="json"), "actor_id": actor.actor_id})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_actor(transaction, db, actor, "offer:claim")
        previous = _prior(idem_ref.get(transaction=transaction), payload_hash, actor.uid)
        if previous is not None:
            return previous
        offer_snapshot = offer_ref.get(transaction=transaction)
        existing_claim_snapshot = claim_ref.get(transaction=transaction)
        offer = offer_snapshot.to_dict() if offer_snapshot.exists else None
        if not offer or offer.get("visibility") != "PUBLIC":
            raise DomainError("NOT_FOUND", "The offer was not found.", 404)
        if existing_claim_snapshot.exists:
            raise DomainError("CLAIM_CONFLICT", "This organization already has a claim for the offer.", 409)
        if offer.get("status") not in {"OPEN", "PARTIALLY_RESERVED"}:
            raise DomainError("OFFER_STATUS_CONFLICT", "The offer is not available for reservation.", 409)
        if _version(offer) != command.expected_offer_version:
            raise DomainError("OFFER_VERSION_CONFLICT", "The offer changed. Refresh before reserving.", 409)
        if offer.get("unit") != command.unit:
            raise DomainError("UNIT_CONFLICT", "The requested unit must exactly match the offer unit.", 409)
        available = offer.get("quantity_available_minor")
        reserved = offer.get("quantity_reserved_minor")
        collected = offer.get("quantity_collected_minor", 0)
        received = offer.get("quantity_received_minor", 0)
        total = offer.get("quantity_total_minor")
        balances = (available, reserved, collected, received, total)
        if any(isinstance(value, bool) or not isinstance(value, int) or value < 0 for value in balances) or total == 0:
            raise DomainError("DATA_UNAVAILABLE", "The offer quantity ledger is invalid.", 503, True)
        if available < command.quantity_minor:
            raise DomainError("QUANTITY_CONFLICT", "The requested amount exceeds the available offer quantity.", 409)
        if received > collected or available + reserved + collected > total:
            raise DomainError("DATA_UNAVAILABLE", "The offer quantity ledger is inconsistent.", 503, True)
        new_available = available - command.quantity_minor
        new_reserved = reserved + command.quantity_minor
        status = "FULLY_RESERVED" if new_available == 0 else "PARTIALLY_RESERVED"
        claim_id = claim_ref.id
        result = {"claim_id": claim_id, "offer_id": offer_id, "org_id": actor.actor_id, "quantity_minor": command.quantity_minor, "unit": command.unit, "status": "RESERVED", "offer_version": command.expected_offer_version + 1}
        claim = {
            **result,
            "recipient_org_id": actor.actor_id,
            "reserved_by": actor.uid,
            "collected_quantity_minor": 0,
            "received_quantity_minor": 0,
            "reserved_at": firestore.SERVER_TIMESTAMP,
            "idempotency_key": idempotency_key,
            "pickup_window_start": offer.get("pickup_window_start"),
            "pickup_window_end": offer.get("pickup_window_end"),
            "version": 1,
        }
        event = {
            "event_id": event_ref.id,
            "claim_id": claim_id,
            "offer_id": offer_id,
            "event_type": "RESERVED",
            "actor_kind": "recipient_org",
            "actor_id": actor.actor_id,
            "actor_uid": actor.uid,
            "quantity_minor": command.quantity_minor,
            "unit": command.unit,
            "occurred_at": firestore.SERVER_TIMESTAMP,
            "idempotency_key": idempotency_key,
        }
        transaction.update(offer_ref, {
            "quantity_available_minor": new_available,
            "quantity_reserved_minor": new_reserved,
            "status": status,
            "version": command.expected_offer_version + 1,
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
        transaction.create(claim_ref, claim)
        transaction.create(event_ref, event)
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": payload_hash, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    transient_errors = (
        google_exceptions.Aborted,
        google_exceptions.DeadlineExceeded,
        google_exceptions.InternalServerError,
        google_exceptions.ResourceExhausted,
        google_exceptions.ServiceUnavailable,
    )
    for attempt in range(3):
        try:
            return commit(db.transaction())
        except DomainError:
            raise
        except transient_errors as exc:
            if attempt < 2:
                time.sleep(0.05 * (2**attempt))
                continue
            try:
                # A lost commit response is safe to reconcile through its idempotency record.
                previous = _prior(idem_ref.get(), payload_hash, actor.uid)
                if previous is not None:
                    return previous
            except DomainError:
                raise
            except Exception:
                pass
            raise DomainError("DATA_UNAVAILABLE", "The reservation could not be created.", 503, True) from exc
        except Exception as exc:
            raise DomainError("DATA_UNAVAILABLE", "The reservation could not be created.", 503, True) from exc
