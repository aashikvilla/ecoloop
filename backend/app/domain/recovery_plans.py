from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import ActorContext
from app.schemas.recipient import PlanStop, RecoveryPlanCreate, RecoveryPlanRecord, RecoveryPlanUpdate


def _hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()).hexdigest()


def _idempotency_ref(db: Any, uid: str, key: str) -> Any:
    actor = hashlib.sha256(uid.encode()).hexdigest()[:24]
    return db.collection("recovery_plan_idempotency").document(f"{actor}_{key}")


def _version(record: dict[str, Any]) -> int:
    value = record.get("version")
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise DomainError("DATA_UNAVAILABLE", "The saved collection version is invalid.", 503, True)
    return value


def _validated_plan(plan_id: str, value: dict[str, Any]) -> dict[str, Any]:
    try:
        return RecoveryPlanRecord.model_validate({"plan_id": plan_id, **value}).model_dump(mode="json")
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The saved collection is invalid.", 503, True) from exc


def _assert_actor(transaction: Any, db: Any, actor: ActorContext, permission: str = "plan:create") -> dict[str, Any]:
    if actor.actor_kind != "recipient_org":
        raise DomainError("FORBIDDEN", "Only recipient organizations can manage recovery collections.", 403)
    from app.domain.recipient_access import assert_recipient_actor

    return assert_recipient_actor(transaction, db, actor, permission)


def _validate_stops(transaction: Any, db: Any, stops: list[PlanStop]) -> None:
    now = datetime.now(timezone.utc)
    for stop in stops:
        ref = db.collection("surplus_offers").document(stop.offer_id)
        snapshot = ref.get(transaction=transaction)
        offer = snapshot.to_dict() if snapshot.exists else None
        if not offer or offer.get("offer_id") != stop.offer_id or offer.get("visibility") != "PUBLIC":
            raise DomainError("OFFER_UNAVAILABLE", "One selected offer is no longer available.", 409)
        if offer.get("status") not in {"OPEN", "PARTIALLY_RESERVED"}:
            raise DomainError("OFFER_UNAVAILABLE", "One selected offer is no longer available.", 409)
        version = offer.get("version")
        if isinstance(version, bool) or not isinstance(version, int) or version != stop.expected_offer_version:
            raise DomainError("OFFER_VERSION_CONFLICT", "A selected offer changed. Refresh it before saving.", 409)
        if offer.get("unit") != stop.unit:
            raise DomainError("OFFER_UNIT_CONFLICT", "A selected offer uses a different quantity unit.", 409)
        available = offer.get("quantity_available_minor")
        if isinstance(available, bool) or not isinstance(available, int) or available < stop.requested_quantity_minor:
            raise DomainError("OFFER_QUANTITY_CONFLICT", "A selected offer has less available than requested.", 409)
        end = offer.get("pickup_window_end")
        expiry = offer.get("expiry_at")
        if not isinstance(end, datetime) or end.tzinfo is None or end <= now or (expiry is not None and (not isinstance(expiry, datetime) or expiry.tzinfo is None or expiry <= now)):
            raise DomainError("OFFER_EXPIRED", "A selected offer has passed its pickup or expiry time.", 409)


def _record(
    plan_id: str,
    org_id: str,
    uid: str,
    command: RecoveryPlanCreate | RecoveryPlanUpdate,
    version: int,
    now: datetime,
    created_at: datetime,
    old: dict[str, Any] | None = None,
) -> dict[str, Any]:
    stops = [stop.model_dump(mode="json") for stop in command.stops]
    return {
        "org_id": org_id,
        "created_by": (old or {}).get("created_by", uid),
        "name": command.name or (old or {}).get("name") or f"Collection {now:%b %d, %Y}",
        "origin": command.origin.model_dump(mode="json"),
        "destination": command.destination.model_dump(mode="json"),
        "need": command.need.model_dump(mode="json") if command.need else None,
        "stops": stops,
        "status": "ACTIVE",
        "version": version,
        "created_at": created_at,
        "updated_at": now,
    }


def create_recovery_plan(actor: ActorContext, command: RecoveryPlanCreate, idempotency_key: str) -> dict[str, Any]:
    db = get_firestore()
    plan_ref = db.collection("recovery_plans").document()
    idem_ref = _idempotency_ref(db, actor.uid, f"create_{idempotency_key}")
    fingerprint = _hash({"org_id": actor.actor_id, **command.model_dump(mode="json")})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        organization = _assert_actor(transaction, db, actor, "plan:create")
        previous = idem_ref.get(transaction=transaction)
        if previous.exists:
            item = previous.to_dict() or {}
            if item.get("actor_uid") != actor.uid or item.get("payload_hash") != fingerprint:
                raise DomainError("IDEMPOTENCY_CONFLICT", "This request key was already used for another command.", 409)
            return item["result"]
        saved_base = organization.get("pickup_base")
        if not isinstance(saved_base, dict) or command.destination.model_dump(mode="json") != saved_base:
            raise DomainError("PROFILE_BASE_CONFLICT", "The collection destination must match the current organization pickup base.", 409)
        _validate_stops(transaction, db, command.stops)
        value = _record(plan_ref.id, actor.actor_id, actor.uid, command, 1, now, now)
        result = _validated_plan(plan_ref.id, value)
        value["created_at"] = firestore.SERVER_TIMESTAMP
        value["updated_at"] = firestore.SERVER_TIMESTAMP
        transaction.create(plan_ref, value)
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": fingerprint, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The collection could not be saved.", 503, True) from exc


def list_recovery_plans(actor: ActorContext, limit: int = 25) -> dict[str, Any]:
    db = get_firestore()
    try:
        _assert_actor(None, db, actor, "plan:create")
        snapshots = db.collection("recovery_plans").where("org_id", "==", actor.actor_id).order_by("updated_at", direction=firestore.Query.DESCENDING).limit(min(max(limit, 1), 50)).stream()
        plans = []
        for snapshot in snapshots:
            record = snapshot.to_dict() or {}
            if record.get("org_id") == actor.actor_id:
                plans.append(_validated_plan(snapshot.id, record))
        return {"plans": plans}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Collections could not be read.", 503, True) from exc


def read_recovery_plan(actor: ActorContext, plan_id: str) -> dict[str, Any]:
    db = get_firestore()
    try:
        _assert_actor(None, db, actor, "plan:create")
        snapshot = db.collection("recovery_plans").document(plan_id).get()
        record = snapshot.to_dict() if snapshot.exists else None
        if not record or record.get("org_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The collection was not found.", 404)
        return _validated_plan(plan_id, record)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The collection could not be read.", 503, True) from exc


def update_recovery_plan(actor: ActorContext, plan_id: str, command: RecoveryPlanUpdate, idempotency_key: str) -> dict[str, Any]:
    db = get_firestore()
    plan_ref = db.collection("recovery_plans").document(plan_id)
    idem_ref = _idempotency_ref(db, actor.uid, f"update_{plan_id}_{idempotency_key}")
    fingerprint = _hash({"plan_id": plan_id, **command.model_dump(mode="json")})
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_actor(transaction, db, actor, "plan:edit")
        previous = idem_ref.get(transaction=transaction)
        if previous.exists:
            item = previous.to_dict() or {}
            if item.get("actor_uid") != actor.uid or item.get("payload_hash") != fingerprint:
                raise DomainError("IDEMPOTENCY_CONFLICT", "This request key was already used for another command.", 409)
            return item["result"]
        snapshot = plan_ref.get(transaction=transaction)
        old = snapshot.to_dict() if snapshot.exists else None
        if not old or old.get("org_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The collection was not found.", 404)
        current = _version(old)
        if current != command.expected_version:
            raise DomainError("PLAN_VERSION_CONFLICT", "The collection changed. Reload it before editing.", 409)
        old_stops = {item.get("stop_id"): item for item in old.get("stops", []) if isinstance(item, dict)}
        new_stops = {stop.stop_id: stop for stop in command.stops}
        # A saved reservation or outcome cannot be detached or rewritten by a draft edit.
        for stop_id, previous_stop in old_stops.items():
            if previous_stop.get("status") in {"RESERVED", "COLLECTED", "RECEIVED"}:
                current_stop = new_stops.get(stop_id)
                if current_stop is None or current_stop.model_dump(mode="json") != previous_stop:
                    raise DomainError("PLAN_STOP_CONFLICT", "A reserved or completed collection stop cannot be edited here.", 409)
        if any(stop.status != "SELECTED" or stop.claim_id for stop in command.stops if stop.stop_id not in old_stops or old_stops.get(stop.stop_id, {}).get("status") not in {"RESERVED", "COLLECTED", "RECEIVED"}):
            raise DomainError("PLAN_STOP_CONFLICT", "Collection stop lifecycle changes require an explicit reservation or outcome action.", 409)
        editable = [stop for stop in command.stops if stop.status == "SELECTED" and not stop.claim_id]
        _validate_stops(transaction, db, editable)
        value = _record(plan_id, actor.actor_id, actor.uid, command, current + 1, now, old.get("created_at", now), old)
        # Preserve lifecycle state for linked stops and derive progress from those stops.
        value["stops"] = [
            old_stops[stop.stop_id] if stop.stop_id in old_stops and old_stops[stop.stop_id].get("status") in {"RESERVED", "COLLECTED", "RECEIVED"}
            else stop.model_dump(mode="json")
            for stop in command.stops
        ]
        statuses = {item.get("status") for item in value["stops"]}
        value["status"] = "COMPLETED" if statuses and statuses <= {"RECEIVED", "CANCELLED", "EXPIRED"} else "PARTIAL" if statuses & {"RESERVED", "COLLECTED", "RECEIVED", "UNAVAILABLE"} else "ACTIVE"
        result = _validated_plan(plan_id, value)
        value["updated_at"] = firestore.SERVER_TIMESTAMP
        transaction.set(plan_ref, value)
        transaction.create(idem_ref, {"actor_uid": actor.uid, "payload_hash": fingerprint, "result": result, "created_at": firestore.SERVER_TIMESTAMP})
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The collection could not be updated.", 503, True) from exc
