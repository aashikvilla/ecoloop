from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.schemas.household import AssistantEnvelope, AssistantTurnRequest, BuyCheckCard
from app.schemas.proposals import ProposalActionCommand


PROPOSAL_LIFETIME = timedelta(minutes=15)
HISTORY_LIMIT = 10


def _household(db: Any, principal: Principal) -> Any:
    return db.collection("households").document(principal.household_id)


def _member_ref(db: Any, principal: Principal) -> Any:
    return _household(db, principal).collection("members").document(principal.uid)


def _assert_member(transaction: Any, db: Any, principal: Principal) -> None:
    snap = _member_ref(db, principal).get(transaction=transaction)
    data = snap.to_dict() if snap.exists else None
    if not data or data.get("uid") != principal.uid or data.get("status") != "ACTIVE" or data.get("role") != principal.role:
        raise DomainError("FORBIDDEN", "The requested household membership is not available.", 403)


def _turns(db: Any, principal: Principal) -> Any:
    # Conversations are private to their creator, even inside a shared household.
    return _household(db, principal).collection("assistant_users").document(principal.uid).collection("turns")


def persist_turn(principal: Principal, request: AssistantTurnRequest, envelope: AssistantEnvelope) -> AssistantEnvelope:
    """Receive validated agent output on the server; the browser cannot submit a card receipt."""
    db = get_firestore()
    now = datetime.now(timezone.utc)
    expires_at = now + PROPOSAL_LIFETIME
    cards = []
    for source in envelope.cards[:3]:
        # The agent's IDs, versions, and expiry have no authority over durable records.
        card = source.model_copy(update={
            "proposal_id": uuid.uuid4().hex,
            "version": 1,
            "expires_at": expires_at,
            "simulated": True,
        })
        cards.append(card)
    durable = envelope.model_copy(update={"cards": cards})
    turn_id = uuid.uuid4().hex
    turn_ref = _turns(db, principal).document(turn_id)
    receipt_collection = _household(db, principal).collection("assistant_proposals")

    @firestore.transactional
    def commit(transaction: Any) -> None:
        _assert_member(transaction, db, principal)
        transaction.create(turn_ref, {
            "actor_uid": principal.uid,
            "created_at": now,
            "user_text": request.text,
            "envelope": durable.model_dump(mode="json"),
            "resolutions": {},
        })
        for card in cards:
            transaction.create(receipt_collection.document(card.proposal_id), {
                "actor_uid": principal.uid,
                "household_id": principal.household_id,
                "turn_id": turn_id,
                "created_at": now,
                "expires_at": expires_at,
                "version": 1,
                "status": "PENDING",
                "card": card.model_dump(mode="json"),
            })

    try:
        commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The assistant response could not be saved.", 503, True) from exc
    return durable


def list_turns(principal: Principal) -> list[dict[str, Any]]:
    try:
        snapshots = _turns(get_firestore(), principal).order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).limit(HISTORY_LIMIT).stream()
        result = []
        for snapshot in snapshots:
            data = snapshot.to_dict() or {}
            result.append({
                "turn_id": snapshot.id,
                "created_at": data["created_at"].isoformat(),
                "user_text": data["user_text"],
                "envelope": data["envelope"],
                "resolutions": data.get("resolutions", {}),
            })
        return result
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The assistant history is unavailable.", 503, True) from exc


def apply_proposal_action(principal: Principal, proposal_id: str, command: ProposalActionCommand) -> dict[str, Any]:
    db = get_firestore()
    household = _household(db, principal)
    receipt_ref = household.collection("assistant_proposals").document(proposal_id)
    actor_scope = hashlib.sha256(principal.uid.encode("utf-8")).hexdigest()
    idem_ref = household.collection("idempotency").document(f"proposal:{actor_scope}:{command.idempotency_key}")
    payload = {"proposal_id": proposal_id, **command.model_dump(mode="json")}
    payload_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member(transaction, db, principal)
        old = idem_ref.get(transaction=transaction)
        if old.exists:
            previous = old.to_dict() or {}
            if previous.get("actor_uid") != principal.uid or previous.get("payload_hash") != payload_hash:
                raise DomainError("IDEMPOTENCY_CONFLICT", "This retry key was used for another action.", 409)
            result = previous.get("result")
            if not isinstance(result, dict):
                raise DomainError("DATA_UNAVAILABLE", "The prior action result is unavailable.", 503, True)
            return result
        receipt = receipt_ref.get(transaction=transaction)
        data = receipt.to_dict() if receipt.exists else None
        if not data or data.get("actor_uid") != principal.uid or data.get("household_id") != principal.household_id:
            raise DomainError("NOT_FOUND", "This proposal is unavailable.", 404)
        if data.get("status") != "PENDING" or data.get("version") != command.base_version:
            raise DomainError("VERSION_CONFLICT", "This proposal changed. Reload before taking action.", 409)
        expiry = data.get("expires_at")
        if not isinstance(expiry, datetime) or expiry.tzinfo is None or expiry <= now:
            raise DomainError("PROPOSAL_EXPIRED", "This proposal expired. Ask again for a current suggestion.", 409)
        card = data.get("card")
        entry_ref = None
        if command.action == "ADD":
            try:
                buy = BuyCheckCard.model_validate(card)
            except Exception as exc:
                raise DomainError("DATA_UNAVAILABLE", "The saved proposal is invalid.", 503, True) from exc
            if buy.shopping_action != "ADD" or "ADD" not in buy.allowed_actions:
                raise DomainError("INVALID_ACTION", "This proposal cannot be added to the shopping list.", 422)
            entry_ref = household.collection("shopping_entries").document(f"ai:{proposal_id}")
            if entry_ref.get(transaction=transaction).exists:
                raise DomainError("VERSION_CONFLICT", "This shopping entry already exists.", 409)
        result: dict[str, Any] = {
            "proposal_id": proposal_id,
            "status": "APPROVED" if command.action == "ADD" else "DISMISSED",
            "version": command.base_version + 1,
            "action": command.action,
        }
        if entry_ref is not None:
            result["entry_id"] = entry_ref.id
            transaction.create(entry_ref, {
                "entry_id": entry_ref.id,
                "item_name": buy.item_name,
                "desired_amount": None,
                "unit": None,
                "household_id": principal.household_id,
                "version": 1,
                "updated_by": principal.uid,
                "updated_at": now,
                "source_proposal_id": proposal_id,
            })
        transaction.update(receipt_ref, {
            "status": result["status"], "version": result["version"],
            "resolved_at": now, "resolved_by": principal.uid,
        })
        transaction.update(_turns(db, principal).document(data["turn_id"]), {
            f"resolutions.{proposal_id}": result,
        })
        transaction.create(idem_ref, {
            "actor_uid": principal.uid, "payload_hash": payload_hash,
            "result": result, "created_at": now,
        })
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The proposal action could not be confirmed.", 503, True) from exc
