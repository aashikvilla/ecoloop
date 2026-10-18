from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import ActorContext
from app.domain.recipient_access import assert_recipient_actor, require_donor_actor
from app.schemas.recipient import (
    ClaimCancel,
    ClaimCollect,
    ClaimReceive,
    ReceiptAdjustment,
    ReservePlanStop,
)

def _stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("\0".join(parts).encode("utf-8")).hexdigest()
    return f"{prefix}_{digest}"

def _hash(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

def _version(value: dict[str, Any]) -> int:
    version = value.get("version")
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        raise DomainError("DATA_UNAVAILABLE", "A stored version is invalid; reload this record.", 503, True)
    return version

def _positive(value: Any, label: str, *, allow_zero: bool = False) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < (0 if allow_zero else 1):
        raise DomainError("DATA_UNAVAILABLE", f"The stored {label} is invalid.", 503, True)
    return value

def _prior(snapshot: Any, fingerprint: str, uid: str) -> dict[str, Any] | None:
    if not snapshot.exists:
        return None
    data = snapshot.to_dict() or {}
    if data.get("actor_uid") != uid or data.get("payload_hash") != fingerprint:
        raise DomainError("IDEMPOTENCY_CONFLICT", "This request key was already used for another command.", 409)
    result = data.get("result")
    if not isinstance(result, dict):
        raise DomainError("DATA_UNAVAILABLE", "The saved command result is unavailable.", 503, True)
    return result

def _idem_ref(db: Any, actor: ActorContext, action: str, key: str) -> Any:
    scope = hashlib.sha256(actor.uid.encode("utf-8")).hexdigest()[:24]
    return db.collection("recipient_idempotency").document(f"{scope}_{action}_{key}")

def _event_ref(db: Any, claim_id: str, event_key: str) -> Any:
    return db.collection("pickup_events").document(_stable_id("pickup", claim_id, event_key))

def _ledger(offer: dict[str, Any]) -> tuple[int, int, int, int, int]:
    available = _positive(offer.get("quantity_available_minor"), "offer available quantity", allow_zero=True)
    reserved = _positive(offer.get("quantity_reserved_minor"), "offer reserved quantity", allow_zero=True)
    collected = _positive(offer.get("quantity_collected_minor", 0), "offer collected quantity", allow_zero=True)
    received = _positive(offer.get("quantity_received_minor", 0), "offer received quantity", allow_zero=True)
    total = _positive(offer.get("quantity_total_minor"), "offer total quantity")
    if received > collected or available + reserved + collected > total:
        raise DomainError("DATA_UNAVAILABLE", "The offer quantity ledger is inconsistent.", 503, True)
    return available, reserved, collected, received, total

def _offer_status(available: int, reserved: int, current: str) -> str:
    if current in {"CANCELLED", "CLOSED", "EXPIRED"}:
        return current
    if reserved > 0 and available == 0:
        return "FULLY_RESERVED"
    if reserved > 0:
        return "PARTIALLY_RESERVED"
    if available > 0:
        return "OPEN"
    return "CLOSED"

def _find_stop(plan: dict[str, Any], stop_id: str) -> tuple[int, dict[str, Any]]:
    stops = plan.get("stops")
    if not isinstance(stops, list):
        raise DomainError("DATA_UNAVAILABLE", "The saved collection stops are invalid.", 503, True)
    for index, item in enumerate(stops):
        if isinstance(item, dict) and item.get("stop_id") == stop_id:
            return index, item
    raise DomainError("NOT_FOUND", "The collection stop was not found.", 404)

def _replace_stop(stops: list[dict[str, Any]], index: int, changes: dict[str, Any]) -> list[dict[str, Any]]:
    result = [dict(stop) for stop in stops]
    result[index].update(changes, version=_version(result[index]) + 1)
    return result

def _plan_status(stops: list[dict[str, Any]]) -> str:
    active = [s for s in stops if s.get("status") not in {"CANCELLED", "UNAVAILABLE", "EXPIRED"}]
    if not active:
        return "CANCELLED"
    if all(s.get("status") == "RECEIVED" for s in active):
        return "COMPLETED"
    if all(s.get("status") in {"COLLECTED", "RECEIVED"} for s in active):
        return "PARTIAL"
    return "ACTIVE"

def _new_event(
    ref: Any, *, claim: dict[str, Any], actor: ActorContext, event_type: str,
    quantity: int, idempotency_key: str, reason: str | None = None,
) -> dict[str, Any]:
    event = {
        "event_id": ref.id,
        "claim_id": claim["claim_id"],
        "offer_id": claim["offer_id"],
        "event_type": event_type,
        "actor_kind": actor.actor_kind,
        "actor_id": actor.actor_id,
        "actor_uid": actor.uid,
        "quantity_minor": quantity,
        "unit": claim["unit"],
        "occurred_at": firestore.SERVER_TIMESTAMP,
        "idempotency_key": idempotency_key,
    }
    if reason is not None:
        event["reason"] = reason
    return event
def _read_claim_ref(db: Any, claim_id: str) -> Any:
    return db.collection("offer_claims").document(claim_id)

def _require_recipient(actor: ActorContext) -> None:
    if actor.actor_kind != "recipient_org":
        raise DomainError("FORBIDDEN", "This action requires an active recipient organization.", 403)

def _commit(db: Any, callback: Any, failure: str) -> dict[str, Any]:
    try:
        return callback(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", failure, 503, True) from exc

def reserve_plan_stop(actor: ActorContext, plan_id: str, stop_id: str, command: ReservePlanStop, idempotency_key: str) -> dict[str, Any]:
    _require_recipient(actor)
    db = get_firestore()
    plan_ref = db.collection("recovery_plans").document(plan_id)
    plan_snapshot = plan_ref.get()
    plan = plan_snapshot.to_dict() if plan_snapshot.exists else None
    if not plan or plan.get("org_id") != actor.actor_id:
        raise DomainError("NOT_FOUND", "The collection was not found.", 404)
    _, stop = _find_stop(plan, stop_id)
    offer_id = stop.get("offer_id")
    if not isinstance(offer_id, str) or not offer_id:
        raise DomainError("DATA_UNAVAILABLE", "The selected offer reference is invalid.", 503, True)
    # Preserve the offer/org claim identity used by the original API. It also
    # prevents a cancelled or legacy claim from being silently reserved again.
    claim_id = _stable_id("claim", offer_id, actor.actor_id)
    claim_ref = _read_claim_ref(db, claim_id)
    offer_ref = db.collection("surplus_offers").document(offer_id)
    idem_ref = _idem_ref(db, actor, "reserve", idempotency_key)
    reserved_event_ref = _event_ref(db, claim_id, "reserved")
    payload_hash = _hash({"plan_id": plan_id, "stop_id": stop_id, **command.model_dump(mode="json"), "org_id": actor.actor_id})

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        assert_recipient_actor(transaction, db, actor, "offer:claim")
        previous = _prior(idem_ref.get(transaction=transaction), payload_hash, actor.uid)
        if previous is not None:
            return previous
        plan_snap = plan_ref.get(transaction=transaction)
        offer_snap = offer_ref.get(transaction=transaction)
        claim_snap = claim_ref.get(transaction=transaction)
        if not plan_snap.exists or not offer_snap.exists:
            raise DomainError("NOT_FOUND", "The collection stop is no longer available.", 404)
        current_plan = plan_snap.to_dict() or {}
        current_offer = offer_snap.to_dict() or {}
        if current_plan.get("org_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The collection was not found.", 404)
        plan_version = _version(current_plan)
        if plan_version != command.expected_plan_version:
            raise DomainError("PLAN_VERSION_CONFLICT", "The collection changed. Refresh before reserving.", 409)
        index, current_stop = _find_stop(current_plan, stop_id)
        if current_stop.get("offer_id") != offer_id:
            raise DomainError("PLAN_CONFLICT", "The collection stop changed. Refresh before reserving.", 409)
        if current_stop.get("status") != "SELECTED" or claim_snap.exists:
            raise DomainError("CLAIM_CONFLICT", "This stop is no longer available to reserve.", 409)
        if current_offer.get("visibility") != "PUBLIC" or current_offer.get("status") not in {"OPEN", "PARTIALLY_RESERVED"}:
            raise DomainError("OFFER_STATUS_CONFLICT", "The offer is not available for reservation.", 409)
        offer_version = _version(current_offer)
        if offer_version != command.expected_offer_version or current_stop.get("expected_offer_version") != command.expected_offer_version:
            raise DomainError("OFFER_VERSION_CONFLICT", "The offer changed. Refresh before reserving.", 409)
        now = datetime.now(timezone.utc)
        window_end = current_offer.get("pickup_window_end")
        expiry = current_offer.get("expiry_at")
        if not isinstance(window_end, datetime) or window_end.tzinfo is None or window_end <= now or (isinstance(expiry, datetime) and expiry <= now):
            raise DomainError("OFFER_EXPIRED", "The pickup window has ended or the donor-declared expiry has passed.", 409)
        amount = _positive(current_stop.get("requested_quantity_minor"), "requested stop quantity")
        if current_offer.get("unit") != current_stop.get("unit"):
            raise DomainError("UNIT_CONFLICT", "The requested unit must match the offer unit.", 409)
        available, reserved, collected, received, _ = _ledger(current_offer)
        if available < amount:
            raise DomainError("QUANTITY_CONFLICT", "The requested amount exceeds the available offer quantity.", 409)
        new_available, new_reserved = available - amount, reserved + amount
        claim = {
            "claim_id": claim_id, "plan_id": plan_id, "stop_id": stop_id,
            "offer_id": offer_id, "org_id": actor.actor_id,
            "recipient_org_id": actor.actor_id, "reserved_by": actor.uid,
            "quantity_minor": amount, "unit": current_offer["unit"],
            "status": "RESERVED", "collected_quantity_minor": 0,
            "received_quantity_minor": 0, "handed_over_quantity_minor": None,
            "pickup_window_start": current_offer.get("pickup_window_start"),
            "pickup_window_end": window_end, "offer_version": offer_version + 1,
            "version": 1, "reserved_at": firestore.SERVER_TIMESTAMP,
            "donor_kind": (current_offer.get("donor") or {}).get("kind"),
            "donor_owner_id": (current_offer.get("donor") or {}).get("owner_id"),
        }
        stops = _replace_stop(current_plan["stops"], index, {"status": "RESERVED", "claim_id": claim_id})
        result = {"claim_id": claim_id, "plan_id": plan_id, "stop_id": stop_id, "offer_id": offer_id, "quantity_minor": amount, "unit": claim["unit"], "status": "RESERVED", "version": 1}
        transaction.update(offer_ref, {
            "quantity_available_minor": new_available, "quantity_reserved_minor": new_reserved,
            "status": _offer_status(new_available, new_reserved, current_offer.get("status", "OPEN")),
            "version": offer_version + 1, "updated_at": firestore.SERVER_TIMESTAMP,
        })
        transaction.create(claim_ref, claim)
        transaction.create(reserved_event_ref, _new_event(reserved_event_ref, claim=claim, actor=actor, event_type="RESERVED", quantity=amount, idempotency_key=idempotency_key))
        transaction.update(plan_ref, {"stops": stops, "status": _plan_status(stops), "version": plan_version + 1, "updated_at": firestore.SERVER_TIMESTAMP})
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": payload_hash, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    return _commit(db, commit, "The reservation could not be created; retry with the same request key.")

def list_my_claims(actor: ActorContext, limit: int = 100) -> dict[str, Any]:
    _require_recipient(actor)
    db = get_firestore()
    try:
        @firestore.transactional
        def authorize(transaction: Any) -> None:
            assert_recipient_actor(transaction, db, actor, "claim:read")
        authorize(db.transaction())
        snapshots = db.collection("offer_claims").where("recipient_org_id", "==", actor.actor_id).limit(min(max(limit, 1), 100)).stream()
        claims = []
        for snap in snapshots:
            claim = snap.to_dict() or {}
            # Old standalone claims remain historical records, but cannot be
            # presented as routable collection stops without a plan link.
            if isinstance(claim.get("plan_id"), str) and isinstance(claim.get("stop_id"), str):
                claims.append(_claim_view(db, actor, snap.id, claim))
        return {"claims": claims}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Claims could not be read.", 503, True) from exc

def _claim_view(db: Any, actor: ActorContext, claim_id: str, claim: dict[str, Any]) -> dict[str, Any]:
    offer_ref = db.collection("surplus_offers").document(str(claim.get("offer_id", "")))
    offer_snap = offer_ref.get()
    offer = offer_snap.to_dict() if offer_snap.exists else None
    if not offer:
        raise DomainError("DATA_UNAVAILABLE", "A claimed offer record is missing.", 503, True)
    donor = offer.get("donor") or {}
    if actor.actor_kind == "recipient_org":
        if claim.get("recipient_org_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The claim was not found.", 404)
    else:
        donor_kind = "business" if actor.actor_kind == "business" else "household"
        if donor.get("kind") != donor_kind or donor.get("owner_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The claim was not found.", 404)
    pickup_deadline = claim.get("pickup_window_end")
    expiry = offer.get("expiry_at")
    now = datetime.now(timezone.utc)
    details_are_active = (
        claim.get("status") == "RESERVED"
        and isinstance(pickup_deadline, datetime)
        and pickup_deadline.tzinfo is not None
        and pickup_deadline > now
        and (expiry is None or isinstance(expiry, datetime) and expiry.tzinfo is not None and expiry > now)
    )
    return {
        "claim_id": claim_id, "plan_id": claim.get("plan_id"), "stop_id": claim.get("stop_id"),
        "offer_id": claim.get("offer_id"), "recipient_org_id": claim.get("recipient_org_id"),
        "quantity_minor": claim.get("quantity_minor"), "unit": claim.get("unit"),
        "status": claim.get("status"), "collected_quantity_minor": claim.get("collected_quantity_minor", 0),
        "received_quantity_minor": claim.get("received_quantity_minor", 0),
        "handed_over_quantity_minor": claim.get("handed_over_quantity_minor"),
        "version": claim.get("version"), "pickup_window_start": claim.get("pickup_window_start"),
        "pickup_window_end": claim.get("pickup_window_end"),
        "exact_address": offer.get("exact_address") if details_are_active else None,
        "pickup_instructions": offer.get("pickup_instructions", "") if details_are_active else None,
        "latitude": offer.get("latitude") if details_are_active else None,
        "longitude": offer.get("longitude") if details_are_active else None,
        "donor_kind": donor.get("kind"), "donor_owner_id": donor.get("owner_id"),
    }

def get_claim(actor: ActorContext, claim_id: str) -> dict[str, Any]:
    db = get_firestore()
    claim_ref = _read_claim_ref(db, claim_id)
    snap = claim_ref.get()
    claim = snap.to_dict() if snap.exists else None
    if not claim or not isinstance(claim.get("plan_id"), str) or not isinstance(claim.get("stop_id"), str):
        raise DomainError("NOT_FOUND", "The claim was not found.", 404)
    try:
        if actor.actor_kind == "recipient_org":
            @firestore.transactional
            def authorize(transaction: Any) -> None:
                assert_recipient_actor(transaction, db, actor, "claim:read")
            authorize(db.transaction())
        else:
            offer_snap = db.collection("surplus_offers").document(claim.get("offer_id", "")).get()
            offer = offer_snap.to_dict() if offer_snap.exists else None
            if not offer:
                raise DomainError("NOT_FOUND", "The claim was not found.", 404)
            @firestore.transactional
            def authorize_donor(transaction: Any) -> None:
                require_donor_actor(transaction, db, actor, offer, "offer:read")
            authorize_donor(db.transaction())
        return _claim_view(db, actor, claim_id, claim)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The claim could not be read.", 503, True) from exc

def _mutate_claim(actor: ActorContext, claim_id: str, action: str, command: Any, idempotency_key: str) -> dict[str, Any]:
    permission = {"cancel": "claim:cancel", "collect": "claim:collect", "receive": "claim:receive", "adjust": "claim:receive"}[action]
    _require_recipient(actor)
    db = get_firestore()
    claim_ref = _read_claim_ref(db, claim_id)
    idem_ref = _idem_ref(db, actor, action, idempotency_key)
    claim_snapshot = claim_ref.get()
    claim_initial = claim_snapshot.to_dict() if claim_snapshot.exists else None
    if not claim_initial or claim_initial.get("recipient_org_id") != actor.actor_id or not claim_initial.get("plan_id") or not claim_initial.get("stop_id"):
        raise DomainError("NOT_FOUND", "The claim was not found.", 404)
    offer_ref = db.collection("surplus_offers").document(claim_initial["offer_id"])
    plan_ref = db.collection("recovery_plans").document(claim_initial["plan_id"])
    event_key = f"{action}:{idempotency_key}"
    event_ref = _event_ref(db, claim_id, event_key)
    idem_hash = _hash({"claim_id": claim_id, "action": action, **command.model_dump(mode="json"), "org_id": actor.actor_id})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        assert_recipient_actor(transaction, db, actor, permission)
        previous = _prior(idem_ref.get(transaction=transaction), idem_hash, actor.uid)
        if previous is not None:
            return previous
        claim_snap = claim_ref.get(transaction=transaction)
        offer_snap = offer_ref.get(transaction=transaction)
        plan_snap = plan_ref.get(transaction=transaction)
        if not claim_snap.exists or not offer_snap.exists or not plan_snap.exists:
            raise DomainError("NOT_FOUND", "The claim was not found.", 404)
        claim = claim_snap.to_dict() or {}
        offer = offer_snap.to_dict() or {}
        plan = plan_snap.to_dict() or {}
        if claim.get("recipient_org_id") != actor.actor_id or plan.get("org_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The claim was not found.", 404)
        if _version(claim) != command.expected_version:
            raise DomainError("CLAIM_VERSION_CONFLICT", "The claim changed. Refresh before recording this action.", 409)
        offer_version = _version(offer)
        plan_version = _version(plan)
        available, reserved, collected_total, received_total, _ = _ledger(offer)
        claimed = _positive(claim.get("quantity_minor"), "claim reservation")
        got = _positive(claim.get("collected_quantity_minor", 0), "collected quantity", allow_zero=True)
        received = _positive(claim.get("received_quantity_minor", 0), "received quantity", allow_zero=True)
        old_status = claim.get("status")
        index, stop = _find_stop(plan, claim["stop_id"])
        if stop.get("claim_id") != claim_id:
            raise DomainError("DATA_UNAVAILABLE", "The collection no longer links to this claim.", 503, True)
        changes: dict[str, Any] = {}
        offer_changes: dict[str, Any] = {}
        event_type: str
        event_quantity: int
        impact_delta: int | None = None
        reason = getattr(command, "reason", None)
        if action == "cancel":
            if old_status != "RESERVED":
                raise DomainError("CLAIM_STATUS_CONFLICT", "Only an uncollected reservation can be cancelled.", 409)
            if reserved < claimed:
                raise DomainError("DATA_UNAVAILABLE", "The offer reserved balance is inconsistent.", 503, True)
            valid_window = claim.get("pickup_window_end")
            expiry = offer.get("expiry_at")
            releasable = offer.get("status") not in {"CANCELLED", "CLOSED", "EXPIRED"} and isinstance(valid_window, datetime) and valid_window > now and not (isinstance(expiry, datetime) and expiry <= now)
            new_available = available + claimed if releasable else available
            new_reserved = reserved - claimed
            next_offer_status = _offer_status(new_available, new_reserved, offer.get("status", "OPEN"))
            if isinstance(valid_window, datetime) and valid_window <= now or isinstance(expiry, datetime) and expiry <= now:
                next_offer_status = "EXPIRED"
            changes.update(status="CANCELLED", cancelled_reason=reason, cancelled_at=firestore.SERVER_TIMESTAMP)
            offer_changes.update(quantity_available_minor=new_available, quantity_reserved_minor=new_reserved, status=next_offer_status)
            event_type, event_quantity = "CANCELLED", 0
            stop_changes = {"status": "CANCELLED", "failure_code": "RECIPIENT_CANCELLED"}
        elif action == "collect":
            if old_status != "RESERVED":
                raise DomainError("CLAIM_STATUS_CONFLICT", "This claim is not awaiting collection.", 409)
            if offer.get("status") not in {"OPEN", "PARTIALLY_RESERVED", "FULLY_RESERVED"}:
                raise DomainError("CLAIM_STATUS_CONFLICT", "The donor has closed this offer; reconcile the reservation before collection.", 409)
            deadline = claim.get("pickup_window_end")
            expiry = offer.get("expiry_at")
            if not isinstance(deadline, datetime) or deadline <= now or (isinstance(expiry, datetime) and expiry <= now):
                raise DomainError("PICKUP_WINDOW_CLOSED", "Collection must be recorded before the pickup deadline and donor-declared expiry.", 409)
            amount = command.collected_quantity_minor
            if amount > claimed or reserved < claimed:
                raise DomainError("QUANTITY_CONFLICT", "Collected quantity must be within the reserved quantity.", 409)
            remainder = claimed - amount
            new_reserved = reserved - claimed
            new_available = available + remainder
            new_collected = collected_total + amount
            changes.update(status="COLLECTED" if amount else "CANCELLED", collected_quantity_minor=amount, collected_at=firestore.SERVER_TIMESTAMP, collection_reason=reason)
            offer_changes.update(quantity_available_minor=new_available, quantity_reserved_minor=new_reserved, quantity_collected_minor=new_collected, status=_offer_status(new_available, new_reserved, offer.get("status", "OPEN")))
            event_type, event_quantity = "COLLECTOR_COLLECTED", amount
            stop_changes = {"status": "COLLECTED" if amount else "CANCELLED", "collected_quantity_minor": amount, **({"failure_code": "NOTHING_COLLECTED"} if amount == 0 else {})}
        elif action == "receive":
            if old_status != "COLLECTED":
                raise DomainError("CLAIM_STATUS_CONFLICT", "A claim must be collected before receipt can be confirmed.", 409)
            amount = command.received_quantity_minor
            if amount > got:
                raise DomainError("QUANTITY_CONFLICT", "Received quantity cannot exceed collected quantity.", 409)
            changes.update(status="RECEIVED", received_quantity_minor=amount, received_at=firestore.SERVER_TIMESTAMP, receipt_reason=reason)
            offer_changes.update(quantity_received_minor=received_total + amount)
            event_type, event_quantity = "ORG_RECEIVED", amount
            stop_changes = {"status": "RECEIVED", "received_quantity_minor": amount}
        elif action == "adjust":
            if old_status != "RECEIVED":
                raise DomainError("CLAIM_STATUS_CONFLICT", "Only a confirmed receipt can be adjusted.", 409)
            amount = command.corrected_quantity_minor
            if amount > got:
                raise DomainError("QUANTITY_CONFLICT", "Corrected receipt cannot exceed collected quantity.", 409)
            delta = amount - received
            if received_total + delta < 0:
                raise DomainError("DATA_UNAVAILABLE", "The offer receipt ledger is inconsistent.", 503, True)
            changes.update(received_quantity_minor=amount, receipt_adjusted_at=firestore.SERVER_TIMESTAMP, receipt_adjustment_reason=reason)
            offer_changes.update(quantity_received_minor=received_total + delta)
            event_type, event_quantity = "REVERSED", abs(delta)
            impact_delta = delta
            stop_changes = {"received_quantity_minor": amount}
        else:
            raise DomainError("DATA_UNAVAILABLE", "Unsupported claim action.", 500)
        changes["version"] = _version(claim) + 1
        changes["updated_at"] = firestore.SERVER_TIMESTAMP
        if offer_changes:
            offer_changes.update(version=offer_version + 1, updated_at=firestore.SERVER_TIMESTAMP)
            transaction.update(offer_ref, offer_changes)
        stops = _replace_stop(plan["stops"], index, stop_changes)
        plan_status = _plan_status(stops)
        result = {"claim_id": claim_id, "plan_id": claim["plan_id"], "stop_id": claim["stop_id"], "offer_id": claim["offer_id"], "status": changes.get("status", old_status), "collected_quantity_minor": changes.get("collected_quantity_minor", got), "received_quantity_minor": changes.get("received_quantity_minor", received), "version": changes["version"]}
        transaction.update(claim_ref, changes)
        transaction.update(plan_ref, {"stops": stops, "status": plan_status, "version": plan_version + 1, "updated_at": firestore.SERVER_TIMESTAMP})
        transaction.create(event_ref, _new_event(event_ref, claim=claim, actor=actor, event_type=event_type, quantity=event_quantity, idempotency_key=idempotency_key, reason=reason))
        if action in {"receive", "adjust"}:
            _write_impact_event(transaction, db, claim, action, idempotency_key, event_quantity if impact_delta is None else impact_delta, event_ref.id, reason)
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": idem_hash, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    return _commit(db, commit, "The claim action could not be recorded; retry with the same request key.")

def _write_impact_event(transaction: Any, db: Any, claim: dict[str, Any], action: str, key: str, quantity: int, receipt_event_id: str, reason: str | None) -> None:
    ref = db.collection("impact_events").document(_stable_id("impact", claim["claim_id"], action, key))
    data = {
        "event_id": ref.id, "claim_id": claim["claim_id"], "offer_id": claim["offer_id"],
        "plan_id": claim["plan_id"], "recipient_org_id": claim["recipient_org_id"],
        "donor_kind": claim.get("donor_kind"), "donor_owner_id": claim.get("donor_owner_id"),
        "event_type": "RECEIPT_CONFIRMED" if action == "receive" else "RECEIPT_ADJUSTED",
        "quantity_delta_minor": quantity,
        "receipt_event_id": receipt_event_id, "reason": reason,
        "unit": claim["unit"], "recorded_at": firestore.SERVER_TIMESTAMP,
    }
    transaction.create(ref, data)

def cancel_claim(actor: ActorContext, claim_id: str, command: ClaimCancel, idempotency_key: str) -> dict[str, Any]:
    return _mutate_claim(actor, claim_id, "cancel", command, idempotency_key)

def collect_claim(actor: ActorContext, claim_id: str, command: ClaimCollect, idempotency_key: str) -> dict[str, Any]:
    return _mutate_claim(actor, claim_id, "collect", command, idempotency_key)

def receive_claim(actor: ActorContext, claim_id: str, command: ClaimReceive, idempotency_key: str) -> dict[str, Any]:
    return _mutate_claim(actor, claim_id, "receive", command, idempotency_key)

def adjust_receipt(actor: ActorContext, claim_id: str, command: ReceiptAdjustment, idempotency_key: str) -> dict[str, Any]:
    return _mutate_claim(actor, claim_id, "adjust", command, idempotency_key)

