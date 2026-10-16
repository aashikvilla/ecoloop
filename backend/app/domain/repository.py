from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timedelta, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.schemas.household import ConfirmFactsCommand, RecordOutcomeCommand, ShoppingCommand


MAX_OUTCOME_CLOCK_SKEW = timedelta(minutes=5)


def _payload_hash(model: Any) -> str:
    canonical = json.dumps(model.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _household(principal: Principal) -> Any:
    return get_firestore().collection("households").document(principal.household_id)


def _idempotency_ref(household: Any, command_type: str, key: str, actor_uid: str) -> Any:
    actor_scope = hashlib.sha256(actor_uid.encode("utf-8")).hexdigest()
    return household.collection("idempotency").document(f"{command_type}:{actor_scope}:{key}")


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


def _prior_result(snapshot: Any, payload_hash: str, actor_uid: str) -> dict[str, Any] | None:
    if not snapshot.exists:
        return None
    previous = snapshot.to_dict() or {}
    if previous.get("actor_uid") != actor_uid:
        raise DomainError("IDEMPOTENCY_CONFLICT", "This request key cannot be reused by another household member.", 409)
    if previous.get("payload_hash") != payload_hash:
        raise DomainError("IDEMPOTENCY_CONFLICT", "This request key was already used for a different command.", 409)
    result = previous.get("result")
    if not isinstance(result, dict):
        raise DomainError("DATA_UNAVAILABLE", "The saved command result is unavailable.", 503, True)
    return result


def _stored_version(data: dict[str, Any], default: int = 0) -> int:
    value = data.get("version", default)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise DomainError("DATA_UNAVAILABLE", "Stored version data is invalid; reload or reconcile this record.", 503, True)
    return value


def _validate_stored_quantity(item: dict[str, Any]) -> tuple[float | int | None, str | None]:
    amount = item.get("amount")
    unit = item.get("unit")
    if amount is None and unit is None:
        return None, None
    if (
        isinstance(amount, bool)
        or not isinstance(amount, (int, float))
        or not math.isfinite(amount)
        or amount < 0
        or not isinstance(unit, str)
        or not unit
    ):
        raise DomainError("DATA_UNAVAILABLE", "Stored quantity data is invalid; reconcile this item before recording an outcome.", 503, True)
    return amount, unit


def _validate_outcome_time(command: RecordOutcomeCommand, item: dict[str, Any], server_now: datetime) -> None:
    if command.occurred_at > server_now + MAX_OUTCOME_CLOCK_SKEW:
        raise DomainError("INVALID_OUTCOME_TIME", "Outcome time is too far in the future.", 422)
    observed_at = item.get("observed_at")
    if not isinstance(observed_at, datetime) or observed_at.tzinfo is None or observed_at.utcoffset() is None:
        raise DomainError("DATA_UNAVAILABLE", "The confirmed observation time is invalid; reconcile this item before recording an outcome.", 503, True)
    if command.occurred_at <= observed_at.astimezone(timezone.utc):
        raise DomainError("OUTCOME_TIME_CONFLICT", "Outcome time must follow the latest confirmed stock observation. Reconcile the item first.", 409)


def confirm_facts(principal: Principal, command: ConfirmFactsCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    observations = household.collection("food_observations")
    idem_ref = _idempotency_ref(household, "confirm", command.idempotency_key, principal.uid)
    payload_hash = _payload_hash(command)
    refs = [observations.document(item.item_id) for item in command.observations]
    observed_at = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous
        snapshots = [ref.get(transaction=transaction) for ref in refs]
        for item, snapshot in zip(command.observations, snapshots, strict=True):
            current_version = _stored_version(snapshot.to_dict() or {}) if snapshot.exists else 0
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
    idem_ref = _idempotency_ref(household, "outcome", command.idempotency_key, principal.uid)
    payload_hash = _payload_hash(command)
    recorded_at = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous
        item_snapshot = item_ref.get(transaction=transaction)
        outcome_snapshot = outcome_ref.get(transaction=transaction)
        if outcome_snapshot.exists:
            raise DomainError("VERSION_CONFLICT", "This outcome identifier has already been recorded.", 409)
        if not item_snapshot.exists:
            raise DomainError("NOT_FOUND", "The kitchen item was not found.", 404)
        item = item_snapshot.to_dict() or {}
        _validate_outcome_time(command, item, recorded_at)
        if _stored_version(item, default=-1) != command.base_version:
            raise DomainError("VERSION_CONFLICT", "Kitchen facts changed. Reload them before recording this outcome.", 409)

        stock_amount, stock_unit = _validate_stored_quantity(item)
        if command.amount is not None and command.outcome_type.value in {"USED", "DISCARDED", "HANDED_OVER", "COMPOSTED"}:
            if stock_amount is not None and stock_unit != command.unit:
                raise DomainError("UNIT_CONFLICT", "The outcome unit does not match the confirmed stock unit.", 409)
            if stock_amount is not None and command.amount > stock_amount:
                raise DomainError("AMOUNT_CONFLICT", "The outcome amount exceeds confirmed stock; reconcile the item first.", 409)
            if stock_amount is not None:
                item["amount"] = stock_amount - command.amount
        elif command.amount is None and command.outcome_type.value in {"USED", "DISCARDED", "COMPOSTED"} and stock_amount is not None:
            # The outcome changes stock, but without a quantity the prior balance is stale.
            item["amount"] = None
            item["unit"] = None
        if command.outcome_type.value == "STORED":
            item["storage"] = command.storage
        item["version"] = command.base_version + 1
        item["observed_at"] = recorded_at
        item["confirmed_by"] = principal.uid
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
    idem_ref = _idempotency_ref(household, "shopping", command.idempotency_key, principal.uid)
    payload_hash = _payload_hash(command)
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous
        snapshot = entry_ref.get(transaction=transaction)
        current_version = _stored_version(snapshot.to_dict() or {}) if snapshot.exists else 0
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
