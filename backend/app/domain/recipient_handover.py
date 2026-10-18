from __future__ import annotations

from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import ActorContext
from app.domain.recipient_access import require_donor_actor
from app.domain.recipient_claims import (
    _commit,
    _event_ref,
    _hash,
    _idem_ref,
    _new_event,
    _positive,
    _prior,
    _read_claim_ref,
    _version,
)
from app.schemas.recipient import DonorHandover


def donor_confirm_handover(
    actor: ActorContext,
    claim_id: str,
    command: DonorHandover,
    idempotency_key: str,
) -> dict[str, Any]:
    """Record the donor's separate handover quantity without changing stock."""
    db = get_firestore()
    claim_ref = _read_claim_ref(db, claim_id)
    claim_snapshot = claim_ref.get()
    claim = claim_snapshot.to_dict() if claim_snapshot.exists else None
    if not claim or not claim.get("plan_id") or not claim.get("stop_id"):
        raise DomainError("NOT_FOUND", "The claim was not found.", 404)
    offer_ref = db.collection("surplus_offers").document(claim.get("offer_id", ""))
    offer_snapshot = offer_ref.get()
    offer = offer_snapshot.to_dict() if offer_snapshot.exists else None
    if not offer:
        raise DomainError("NOT_FOUND", "The claim was not found.", 404)
    event_ref = _event_ref(db, claim_id, f"handover:{idempotency_key}")
    idempotency_ref = _idem_ref(db, actor, "handover", idempotency_key)
    fingerprint = _hash({"claim_id": claim_id, **command.model_dump(mode="json"), "actor_id": actor.actor_id})

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        require_donor_actor(transaction, db, actor, offer, "offer:read")
        previous = _prior(idempotency_ref.get(transaction=transaction), fingerprint, actor.uid)
        if previous is not None:
            return previous
        current_claim_snapshot = claim_ref.get(transaction=transaction)
        current_offer_snapshot = offer_ref.get(transaction=transaction)
        if not current_claim_snapshot.exists or not current_offer_snapshot.exists:
            raise DomainError("NOT_FOUND", "The claim was not found.", 404)
        current = current_claim_snapshot.to_dict() or {}
        current_offer = current_offer_snapshot.to_dict() or {}
        donor = current_offer.get("donor") or {}
        expected_kind = "business" if actor.actor_kind == "business" else "household"
        if actor.actor_kind == "recipient_org" or donor.get("kind") != expected_kind or donor.get("owner_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The claim was not found.", 404)
        if _version(current) != command.expected_version:
            raise DomainError("CLAIM_VERSION_CONFLICT", "The claim changed. Refresh before confirming handover.", 409)
        if current.get("status") not in {"RESERVED", "COLLECTED", "RECEIVED"}:
            raise DomainError("CLAIM_STATUS_CONFLICT", "Handover can be recorded only for an active or completed claim.", 409)
        amount = command.handed_over_quantity_minor
        if amount > _positive(current.get("quantity_minor"), "claim reservation"):
            raise DomainError("QUANTITY_CONFLICT", "Handover quantity cannot exceed the reservation.", 409)
        result = {"claim_id": claim_id, "handed_over_quantity_minor": amount, "version": _version(current) + 1}
        transaction.update(claim_ref, {
            "handed_over_quantity_minor": amount,
            "handover_reason": command.reason,
            "handover_at": firestore.SERVER_TIMESTAMP,
            "version": result["version"],
            "updated_at": firestore.SERVER_TIMESTAMP,
        })
        transaction.create(event_ref, _new_event(
            event_ref,
            claim=current,
            actor=actor,
            event_type="DONOR_HANDOVER",
            quantity=amount,
            idempotency_key=idempotency_key,
            reason=command.reason,
        ))
        transaction.create(idempotency_ref, {
            "actor_uid": actor.uid,
            "payload_hash": fingerprint,
            "result": result,
            "created_at": firestore.SERVER_TIMESTAMP,
        })
        return result

    return _commit(db, commit, "The handover could not be recorded; retry with the same request key.")
