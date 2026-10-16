from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.domain.repository import _assert_member_in_transaction, _idempotency_ref, _prior_result
from app.schemas.household import DateType
from app.schemas.intake import CreateIntakeCommand, IntakeRecord


def _payload_hash(command: CreateIntakeCommand) -> str:
    canonical = json.dumps(command.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _candidate_value(candidate_id: str, entry: Any) -> dict[str, Any]:
    uncertainty: list[str] = []
    if entry.amount is None:
        uncertainty.append("AMOUNT_UNKNOWN")
    if entry.date_type == DateType.UNKNOWN:
        uncertainty.append("DATE_UNKNOWN")
    if entry.storage is None:
        uncertainty.append("STORAGE_UNKNOWN")
    return {
        "candidate_id": candidate_id,
        "name": entry.name,
        "amount": entry.amount,
        "unit": entry.unit,
        "date_value": entry.date_value,
        "date_type": entry.date_type,
        "date_source": entry.date_source,
        "storage": entry.storage,
        "uncertainty": uncertainty,
    }


def create_intake(principal: Principal, command: CreateIntakeCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    intake_id = uuid4().hex
    intake_ref = household.collection("intakes").document(intake_id)
    idem_ref = _idempotency_ref(household, "intake", command.idempotency_key, principal.uid)
    payload_hash = _payload_hash(command)
    created_at = datetime.now(timezone.utc)
    candidates = [_candidate_value(uuid4().hex, entry) for entry in command.entries]
    record = IntakeRecord(intake_id=intake_id, status="CANDIDATE", candidates=candidates)
    result = record.model_dump(mode="json")

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous
        transaction.set(
            intake_ref,
            {
                **result,
                "household_id": principal.household_id,
                "created_by": principal.uid,
                "source": command.source.value,
                "created_at": created_at,
            },
        )
        transaction.set(
            idem_ref,
            {
                "payload_hash": payload_hash,
                "result": result,
                "created_at": created_at,
                "actor_uid": principal.uid,
            },
        )
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The intake could not be saved.", 503, True) from exc


def read_intake(principal: Principal, intake_id: str) -> dict[str, Any]:
    try:
        snapshot = (
            get_firestore()
            .collection("households")
            .document(principal.household_id)
            .collection("intakes")
            .document(intake_id)
            .get()
        )
        data = snapshot.to_dict() if snapshot.exists else None
        if not data or data.get("created_by") != principal.uid:
            raise DomainError("NOT_FOUND", "The intake was not found.", 404)
        record = {
            "intake_id": data.get("intake_id"),
            "status": data.get("status"),
            "candidates": data.get("candidates"),
        }
        return IntakeRecord.model_validate(record).model_dump(mode="json")
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The intake is unavailable.", 503, True) from exc
