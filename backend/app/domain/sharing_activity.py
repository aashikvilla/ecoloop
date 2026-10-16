from __future__ import annotations

import base64
import hashlib
import json
import math
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from firebase_admin import firestore
from google.cloud.firestore_v1.field_path import FieldPath

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.domain.repository import (
    _assert_member_in_transaction,
    _idempotency_ref,
    _prior_result,
    _stored_version,
    _validate_stored_quantity,
)
from app.schemas.household import (
    CreateShareLogCommand,
    ShareCondition,
    ShareState,
    TransitionShareLogCommand,
)

MAX_EVENT_CLOCK_SKEW = timedelta(minutes=5)
PAGE_MAX = 100


def _household(principal: Principal) -> Any:
    return get_firestore().collection("households").document(principal.household_id)


def _payload_hash(value: Any) -> str:
    payload = value.model_dump(mode="json") if hasattr(value, "model_dump") else value
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _validate_event_time(occurred_at: datetime, after: datetime, server_now: datetime) -> None:
    if occurred_at > server_now + MAX_EVENT_CLOCK_SKEW:
        raise DomainError("INVALID_OUTCOME_TIME", "Activity time is too far in the future.", 422)
    if not isinstance(after, datetime) or after.tzinfo is None or after.utcoffset() is None:
        raise DomainError("DATA_UNAVAILABLE", "The prior event time is invalid; reconcile the source record.", 503, True)
    if occurred_at <= after.astimezone(timezone.utc):
        raise DomainError("OUTCOME_TIME_CONFLICT", "Activity time must follow the latest confirmed event.", 409)


def _check_share_eligibility(item: dict[str, Any], condition: ShareCondition, now: datetime, household_data: dict[str, Any]) -> str | None:
    if condition != ShareCondition.UNSERVED_USER_REPORTED:
        raise DomainError("SHARE_INELIGIBLE", "A share requires an owner-reported unserved item; plate, spoiled, expired, and unknown conditions cannot be offered.", 422)
    date_value = item.get("date_value")
    date_type = item.get("date_type")
    if isinstance(date_value, str):
        try:
            date_value = date.fromisoformat(date_value)
        except ValueError:
            raise DomainError("DATA_UNAVAILABLE", "The item's date observation is invalid; reconcile it before sharing.", 503, True) from None
    if date_type in {"USE_BY", "EXPIRY"} and (not isinstance(date_value, date) or isinstance(date_value, datetime)):
        raise DomainError("DATE_RECONCILIATION_REQUIRED", "The use-by or expiry date is missing or invalid; reconcile it before sharing.", 409)
    if isinstance(date_value, date) and not isinstance(date_value, datetime) and date_type in {"USE_BY", "EXPIRY"}:
        zone_name = household_data.get("time_zone")
        if not isinstance(zone_name, str) or not zone_name:
            raise DomainError("DATE_RECONCILIATION_REQUIRED", "Set a valid household time zone before sharing food with a use-by or expiry date.", 409)
        try:
            local_today = now.astimezone(ZoneInfo(zone_name)).date()
        except (ZoneInfoNotFoundError, ValueError):
            raise DomainError("DATE_RECONCILIATION_REQUIRED", "The household time zone is invalid; reconcile it before sharing dated food.", 409) from None
        if date_value < local_today:
            raise DomainError("SHARE_INELIGIBLE", "Food with a past use-by or expiry date cannot be offered.", 422)
        return zone_name
    return None


def create_share_log(principal: Principal, command: CreateShareLogCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    share_ref = household.collection("share_logs").document(command.share_id)
    item_ref = household.collection("food_observations").document(command.item_id)
    idem_ref = _idempotency_ref(household, "share-create", command.idempotency_key, principal.uid)
    payload_hash = _payload_hash(command)
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous
        share_snapshot = share_ref.get(transaction=transaction)
        item_snapshot = item_ref.get(transaction=transaction)
        household_snapshot = household.get(transaction=transaction)
        if share_snapshot.exists:
            raise DomainError("VERSION_CONFLICT", "This share identifier already exists.", 409)
        if not item_snapshot.exists:
            raise DomainError("NOT_FOUND", "The kitchen item was not found.", 404)
        item = item_snapshot.to_dict() or {}
        if _stored_version(item, default=-1) != command.base_item_version:
            raise DomainError("VERSION_CONFLICT", "Kitchen facts changed. Reload them before offering a share.", 409)
        household_data = household_snapshot.to_dict() if household_snapshot.exists else {}
        eligibility_timezone = _check_share_eligibility(item, command.condition, now, household_data)
        _validate_event_time(command.occurred_at, item.get("observed_at"), now)
        stock_amount, stock_unit = _validate_stored_quantity(item)
        if command.amount is not None and stock_amount is not None:
            if command.unit != stock_unit:
                raise DomainError("UNIT_CONFLICT", "The share amount unit does not match confirmed stock.", 409)
            if command.amount > stock_amount:
                raise DomainError("AMOUNT_CONFLICT", "The share amount exceeds confirmed stock.", 409)
        event = {
            "state": ShareState.OFFERED.value,
            "occurred_at": command.occurred_at,
            "actor_uid": principal.uid,
            "owner_reported": True,
        }
        share = command.model_dump(mode="json", exclude={"idempotency_key", "base_item_version", "condition"})
        share.update(
            household_id=principal.household_id,
            owner_uid=principal.uid,
            item_id=command.item_id,
            base_item_version=command.base_item_version,
            condition=command.condition.value,
            state=ShareState.OFFERED.value,
            version=1,
            history=[event],
            created_at=now,
            updated_at=now,
            owner_reported=True,
            freshness="UNKNOWN",
            eligibility_time_zone=eligibility_timezone,
            eligibility_checked_at=now,
        )
        transaction.set(share_ref, share)
        result = {"share_id": command.share_id, "state": ShareState.OFFERED.value, "version": 1}
        transaction.set(idem_ref, {"payload_hash": payload_hash, "result": result, "created_at": now, "actor_uid": principal.uid})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The share offer could not be saved.", 503, True) from exc


def transition_share_log(principal: Principal, share_id: str, command: TransitionShareLogCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    share_ref = household.collection("share_logs").document(share_id)
    idem_ref = _idempotency_ref(household, "share-transition", command.idempotency_key, principal.uid)
    payload_hash = _payload_hash(command.model_dump(mode="json") | {"share_id": share_id})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous
        share_snapshot = share_ref.get(transaction=transaction)
        if not share_snapshot.exists:
            raise DomainError("NOT_FOUND", "The share log was not found.", 404)
        share = share_snapshot.to_dict() or {}
        if share.get("owner_uid") != principal.uid:
            raise DomainError("FORBIDDEN", "The share log is not available to this member.", 403)
        current_version = _stored_version(share, default=-1)
        if current_version != command.base_version:
            raise DomainError("VERSION_CONFLICT", "This share log changed. Reload it before continuing.", 409)
        current_state = share.get("state")
        allowed = {
            ShareState.OFFERED.value: {ShareState.ACCEPTED.value, ShareState.CANCELLED.value, ShareState.EXPIRED.value},
            ShareState.ACCEPTED.value: {ShareState.HANDED_OVER.value, ShareState.CANCELLED.value, ShareState.EXPIRED.value},
        }
        if command.state.value not in allowed.get(current_state, set()):
            raise DomainError("STATE_CONFLICT", "This share state cannot transition to the requested state.", 409)
        history = share.get("history")
        if not isinstance(history, list) or not history or not isinstance(history[-1], dict):
            raise DomainError("DATA_UNAVAILABLE", "The share history is invalid; reconcile the share log.", 503, True)
        _validate_event_time(command.occurred_at, history[-1].get("occurred_at"), now)

        item_ref = None
        outcome_ref = None
        item: dict[str, Any] | None = None
        if command.state == ShareState.HANDED_OVER:
            item_id = share.get("item_id")
            if not isinstance(item_id, str) or not item_id or "/" in item_id or len(item_id) > 128:
                raise DomainError("DATA_UNAVAILABLE", "The share item reference is invalid; reconcile the share log.", 503, True)
            item_ref = household.collection("food_observations").document(item_id)
            outcome_id = _share_outcome_id(share_id)
            outcome_ref = household.collection("outcomes").document(outcome_id)
            item_snapshot = item_ref.get(transaction=transaction)
            outcome_snapshot = outcome_ref.get(transaction=transaction)
            household_snapshot = household.get(transaction=transaction)
            if not item_snapshot.exists:
                raise DomainError("NOT_FOUND", "The kitchen item was not found.", 404)
            if outcome_snapshot.exists:
                raise DomainError("VERSION_CONFLICT", "A handover outcome already exists for this share.", 409)
            item = item_snapshot.to_dict() or {}
            if _stored_version(item, default=-1) != command.expected_item_version:
                raise DomainError("VERSION_CONFLICT", "Kitchen facts changed. Reload them before confirming handover.", 409)
            if command.condition is None:
                raise DomainError("SHARE_INELIGIBLE", "A current owner-reported food condition is required for handover.", 422)
            household_data = household_snapshot.to_dict() if household_snapshot.exists else {}
            eligibility_timezone = _check_share_eligibility(item, command.condition, now, household_data)
            _validate_event_time(command.occurred_at, item.get("observed_at"), now)

        version = current_version + 1
        event = {
            "state": command.state.value,
            "occurred_at": command.occurred_at,
            "actor_uid": principal.uid,
            "owner_reported": True,
        }
        share.update(
            state=command.state.value,
            version=version,
            updated_at=now,
            history=[*(share.get("history") or []), event],
        )
        result: dict[str, Any] = {"share_id": share_id, "state": command.state.value, "version": version}
        if command.state == ShareState.HANDED_OVER and item_ref is not None and outcome_ref is not None and item is not None:
            stock_amount, stock_unit = _validate_stored_quantity(item)
            if command.amount is not None and stock_amount is not None:
                if command.unit != stock_unit:
                    raise DomainError("UNIT_CONFLICT", "The handover unit does not match confirmed stock.", 409)
                if command.amount > stock_amount:
                    raise DomainError("AMOUNT_CONFLICT", "The handover amount exceeds confirmed stock.", 409)
                item["amount"] = round(stock_amount - command.amount, 6)
            elif command.amount is None and stock_amount is not None:
                # The handover is real but its quantity is unknown; avoid retaining a known stale balance.
                item["amount"] = None
                item["unit"] = None
            item["version"] = command.expected_item_version + 1
            item["observed_at"] = now
            item["confirmed_by"] = principal.uid
            share["condition"] = command.condition.value if command.condition is not None else ShareCondition.UNKNOWN.value
            share["eligibility_time_zone"] = eligibility_timezone
            share["eligibility_checked_at"] = now
            outcome = {
                "outcome_id": _share_outcome_id(share_id),
                "item_id": share["item_id"],
                "outcome_type": ShareState.HANDED_OVER.value,
                "amount": command.amount,
                "unit": command.unit,
                "measurement_basis": command.measurement_basis.value,
                "occurred_at": command.occurred_at,
                "recorded_by": principal.uid,
                "recorded_at": now,
                "household_id": principal.household_id,
                "share_id": share_id,
                "source": "OWNER_SHARE_LOG",
                "version": 1,
            }
            transaction.set(item_ref, item)
            transaction.set(outcome_ref, outcome)
            result["outcome_id"] = outcome["outcome_id"]
            result["item_version"] = command.expected_item_version + 1
        transaction.set(share_ref, share)
        transaction.set(idem_ref, {"payload_hash": payload_hash, "result": result, "created_at": now, "actor_uid": principal.uid})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The share log could not be updated.", 503, True) from exc


def _decode_cursor(cursor: str | None) -> str | None:
    if cursor is None:
        return None
    try:
        value = base64.urlsafe_b64decode(cursor.encode("ascii") + b"=" * (-len(cursor) % 4)).decode("ascii")
        if not value or len(value) > 128 or any(ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-" for ch in value):
            raise ValueError("invalid cursor")
        return value
    except Exception as exc:
        raise DomainError("INVALID_CURSOR", "The activity cursor is invalid.", 422) from exc


def _encode_cursor(document_id: str) -> str:
    return base64.urlsafe_b64encode(document_id.encode("ascii")).decode("ascii").rstrip("=")


def _share_outcome_id(share_id: str) -> str:
    return "share-" + hashlib.sha256(share_id.encode("utf-8")).hexdigest()


def _private_page(principal: Principal, collection: str, owner_field: str, order_field: str, limit: int, cursor: str | None) -> tuple[list[dict[str, Any]], str | None]:
    if not 1 <= limit <= PAGE_MAX:
        raise DomainError("INVALID_LIMIT", "The page limit must be between 1 and 100.", 422)
    household = _household(principal)
    query = (
        household.collection(collection)
        .where(owner_field, "==", principal.uid)
        .order_by(order_field, direction=firestore.Query.DESCENDING)
        .order_by(FieldPath.document_id(), direction=firestore.Query.DESCENDING)
    )
    cursor_id = _decode_cursor(cursor)
    if cursor_id:
        cursor_snapshot = household.collection(collection).document(cursor_id).get()
        cursor_data = cursor_snapshot.to_dict() if cursor_snapshot.exists else None
        if not cursor_data or cursor_data.get(owner_field) != principal.uid:
            raise DomainError("INVALID_CURSOR", "The activity cursor is unavailable.", 422)
        query = query.start_after(cursor_snapshot)
    snapshots = list(query.limit(limit + 1).stream())
    has_more = len(snapshots) > limit
    page = snapshots[:limit]
    values = [snapshot.to_dict() | {"id": snapshot.id} for snapshot in page]
    next_cursor = _encode_cursor(page[-1].id) if has_more and page else None
    return values, next_cursor


def list_share_logs(principal: Principal, limit: int, cursor: str | None) -> dict[str, Any]:
    try:
        records, next_cursor = _private_page(principal, "share_logs", "owner_uid", "updated_at", limit, cursor)
        return {"share_logs": records, "next_cursor": next_cursor}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Share history is unavailable.", 503, True) from exc


def list_activity(principal: Principal, limit: int, cursor: str | None) -> dict[str, Any]:
    try:
        records, next_cursor = _private_page(principal, "outcomes", "recorded_by", "recorded_at", limit, cursor)
        events = []
        for record in records:
            amount = record.get("amount")
            unit = record.get("unit")
            basis = record.get("measurement_basis", "UNKNOWN")
            valid_amount = (
                not isinstance(amount, bool)
                and isinstance(amount, (int, float))
                and math.isfinite(amount)
                and amount > 0
                and isinstance(unit, str)
                and bool(unit)
                and basis in {"MEASURED", "USER_ESTIMATED"}
            )
            if not valid_amount:
                amount = unit = None
                basis = "UNKNOWN"
            events.append({
                "event_id": record.get("outcome_id", record["id"]),
                "item_id": record.get("item_id"),
                "type": record.get("outcome_type"),
                "occurred_at": record.get("occurred_at"),
                "recorded_at": record.get("recorded_at"),
                "amount": amount,
                "unit": unit,
                "measurement_basis": basis,
                "source": record.get("source", "OWNER_RECORDED_OUTCOME"),
            })
        return {"events": events, "next_cursor": next_cursor}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Activity history is unavailable.", 503, True) from exc
