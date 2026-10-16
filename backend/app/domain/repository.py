from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.schemas.household import ConfirmFactsCommand, RecordOutcomeCommand, ShoppingCommand


def _payload_hash(model: Any) -> str:
    canonical = json.dumps(model.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _household(principal: Principal) -> Any:
    return get_firestore().collection("households").document(principal.household_id)


def _idempotency_ref(household: Any, command_type: str, key: str) -> Any:
    return household.collection("idempotency").document(f"{command_type}:{key}")


def _assert_member_in_transaction(transaction: Any, db: Any, principal: Principal) -> None:
    membership_ref = (
        db.collection("households")
        .document(principal.household_id)
        .collection("members")
        .document(principal.uid)
    )
    snapshot = membership_ref.get(transaction=transaction)
    data = snapshot.to_dict() if snapshot.exists else None
    if (
        not data
        or data.get("uid") != principal.uid
        or data.get("status") != "ACTIVE"
        or data.get("role") != principal.role
    ):
        raise DomainError("FORBIDDEN", "The requested household membership is not available.", 403)


def _prior_result(snapshot: Any, payload_hash: str) -> dict[str, Any] | None:
    if not snapshot.exists:
        return None
    previous = snapshot.to_dict() or {}
    if previous.get("payload_hash") != payload_hash:
        raise DomainError("IDEMPOTENCY_CONFLICT", "This request key was already used for a different command.", 409)
    result = previous.get("result")
    if not isinstance(result, dict):
        raise DomainError("DATA_UNAVAILABLE", "The saved command result is unavailable.", 503, True)
    return result


def confirm_facts(principal: Principal, command: ConfirmFactsCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    observations = household.collection("food_observations")
    idem_ref = _idempotency_ref(household, "confirm", command.idempotency_key)
    payload_hash = _payload_hash(command)
    refs = [observations.document(item.item_id) for item in command.observations]
    observed_at = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash)
        if previous is not None:
            return previous
        snapshots = [ref.get(transaction=transaction) for ref in refs]
        for item, snapshot in zip(command.observations, snapshots, strict=True):
            current_version = (snapshot.to_dict() or {}).get("version", 0) if snapshot.exists else 0
            if current_version != item.base_version:
                raise DomainError("VERSION_CONFLICT", "Kitchen facts changed. Reload them and review your edits.", 409)
        saved: list[dict[str, Any]] = []
        for item, ref in zip(command.observations, refs, strict=True):
            value = item.model_dump(mode="json", exclude={"base_version"})
            value.update(
                household_id=principal.household_id,
                version=item.base_version + 1,
                confirmed_by=principal.uid,
                observed_at=observed_at,
            )
            transaction.set(ref, value)
            saved.append({"item_id": item.item_id, "version": item.base_version + 1})
        result = {"observations": saved, "confirmed_at": observed_at.isoformat()}
        transaction.set(
            idem_ref,
            {"payload_hash": payload_hash, "result": result, "created_at": observed_at, "actor_uid": principal.uid},
        )
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The confirmation could not be saved.", 503, True) from exc


def record_outcome(principal: Principal, command: RecordOutcomeCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    item_ref = household.collection("food_observations").document(command.item_id)
    outcome_ref = household.collection("outcomes").document(command.outcome_id)
    idem_ref = _idempotency_ref(household, "outcome", command.idempotency_key)
    payload_hash = _payload_hash(command)
    recorded_at = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash)
        if previous is not None:
            return previous
        item_snapshot = item_ref.get(transaction=transaction)
        outcome_snapshot = outcome_ref.get(transaction=transaction)
        if outcome_snapshot.exists:
            raise DomainError("VERSION_CONFLICT", "This outcome identifier has already been recorded.", 409)
        if not item_snapshot.exists:
            raise DomainError("NOT_FOUND", "The kitchen item was not found.", 404)
        item = item_snapshot.to_dict() or {}
        if item.get("version") != command.base_version:
            raise DomainError("VERSION_CONFLICT", "Kitchen facts changed. Reload them before recording this outcome.", 409)

        if command.amount is not None and command.outcome_type.value in {"USED", "DISCARDED", "HANDED_OVER", "COMPOSTED"}:
            stock_amount = item.get("amount")
            stock_unit = item.get("unit")
            if stock_amount is not None and stock_unit != command.unit:
                raise DomainError("UNIT_CONFLICT", "The outcome unit does not match the confirmed stock unit.", 409)
            if stock_amount is not None and command.amount > stock_amount:
                raise DomainError("AMOUNT_CONFLICT", "The outcome amount exceeds confirmed stock; reconcile the item first.", 409)
            if stock_amount is not None:
                item["amount"] = round(stock_amount - command.amount, 6)
        if command.outcome_type.value == "STORED":
            item["storage"] = command.storage
        item["version"] = command.base_version + 1
        transaction.set(item_ref, item)
        outcome = command.model_dump(mode="json", exclude={"idempotency_key", "base_version"})
        outcome.update(
            household_id=principal.household_id,
            base_version=command.base_version,
            recorded_by=principal.uid,
            recorded_at=recorded_at,
            version=1,
        )
        transaction.set(outcome_ref, outcome)
        result = {"outcome_id": command.outcome_id, "item_id": command.item_id, "item_version": command.base_version + 1}
        transaction.set(
            idem_ref,
            {"payload_hash": payload_hash, "result": result, "created_at": recorded_at, "actor_uid": principal.uid},
        )
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The outcome could not be recorded.", 503, True) from exc


def save_shopping_entry(principal: Principal, command: ShoppingCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    entries = household.collection("shopping_entries")
    entry = command.entry
    entry_ref = entries.document(entry.entry_id)
    idem_ref = _idempotency_ref(household, "shopping", command.idempotency_key)
    payload_hash = _payload_hash(command)
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash)
        if previous is not None:
            return previous
        snapshot = entry_ref.get(transaction=transaction)
        current_version = (snapshot.to_dict() or {}).get("version", 0) if snapshot.exists else 0
        if current_version != entry.base_version:
            raise DomainError("VERSION_CONFLICT", "The shopping entry changed. Reload it and review your edits.", 409)
        value = entry.model_dump(mode="json", exclude={"base_version"})
        value.update(household_id=principal.household_id, version=entry.base_version + 1, updated_by=principal.uid, updated_at=now)
        transaction.set(entry_ref, value)
        result = {"entry_id": entry.entry_id, "version": entry.base_version + 1}
        transaction.set(
            idem_ref,
            {"payload_hash": payload_hash, "result": result, "created_at": now, "actor_uid": principal.uid},
        )
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The shopping entry could not be saved.", 503, True) from exc


def list_shopping_entries(principal: Principal) -> list[dict[str, Any]]:
    try:
        query = _household(principal).collection("shopping_entries").order_by("updated_at", direction=firestore.Query.DESCENDING).limit(200)
        return [snapshot.to_dict() | {"entry_id": snapshot.id} for snapshot in query.stream()]
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The shopping list is unavailable.", 503, True) from exc
