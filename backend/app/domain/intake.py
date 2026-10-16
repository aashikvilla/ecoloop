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
from app.schemas.intake import ConfirmIntakeCommand, CreateIntakeCommand, IntakeConfirmationRecord, IntakeRecord


def _payload_hash(command: CreateIntakeCommand | ConfirmIntakeCommand) -> str:
    canonical = json.dumps(command.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _confirmation_payload_hash(intake_id: str, command: ConfirmIntakeCommand) -> str:
    canonical = json.dumps(
        {"intake_id": intake_id, "command": command.model_dump(mode="json")},
        sort_keys=True,
        separators=(",", ":"),
    )
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
    record = IntakeRecord(intake_id=intake_id, status="CANDIDATE", version=1, candidates=candidates)
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
        record = _intake_record(data, intake_id)
        return IntakeRecord.model_validate(record).model_dump(mode="json")
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The intake is unavailable.", 503, True) from exc


def _intake_record(data: dict[str, Any], intake_id: str) -> dict[str, Any]:
    # Existing candidate records predate versioning and represent their initial version.
    return {
        "intake_id": data.get("intake_id", intake_id),
        "status": data.get("status"),
        "version": data.get("version", 1),
        "candidates": data.get("candidates", []),
    }


def confirm_intake(principal: Principal, intake_id: str, command: ConfirmIntakeCommand) -> dict[str, Any]:
    if principal.role != "OWNER":
        raise DomainError("FORBIDDEN", "Only the household owner can confirm intake candidates.", 403)

    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    intake_ref = household.collection("intakes").document(intake_id)
    observations = household.collection("food_observations")
    idem_ref = _idempotency_ref(household, "intake-confirm", command.idempotency_key, principal.uid)
    payload_hash = _confirmation_payload_hash(intake_id, command)
    observed_at = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        idem_snapshot = idem_ref.get(transaction=transaction)
        intake_snapshot = intake_ref.get(transaction=transaction)
        intake_data = intake_snapshot.to_dict() if intake_snapshot.exists else None
        if not intake_data or intake_data.get("created_by") != principal.uid:
            raise DomainError("NOT_FOUND", "The intake was not found.", 404)

        previous = _prior_result(idem_snapshot, payload_hash, principal.uid)
        if previous is not None:
            return previous

        intake_record = IntakeRecord.model_validate(_intake_record(intake_data, intake_id))
        if intake_record.version != command.base_version:
            raise DomainError("VERSION_CONFLICT", "This intake changed. Reload it and review your edits.", 409)

        pending_by_id = {candidate.candidate_id: candidate for candidate in intake_record.candidates}
        selected_ids = [candidate.candidate_id for candidate in command.candidates]
        if any(candidate_id not in pending_by_id for candidate_id in selected_ids):
            raise DomainError("VERSION_CONFLICT", "One or more candidates are no longer pending in this intake.", 409)

        item_refs = [observations.document(candidate_id) for candidate_id in selected_ids]
        item_snapshots = [ref.get(transaction=transaction) for ref in item_refs]
        if any(snapshot.exists for snapshot in item_snapshots):
            raise DomainError("VERSION_CONFLICT", "A selected candidate already has a confirmed kitchen item.", 409)

        selected = set(selected_ids)
        remaining = [candidate for candidate in intake_record.candidates if candidate.candidate_id not in selected]
        next_version = intake_record.version + 1
        status_value = "CONFIRMED" if not remaining else "CANDIDATE"
        result = IntakeConfirmationRecord(
            intake_id=intake_id,
            status=status_value,
            version=next_version,
            candidates=remaining,
            confirmed=[{"item_id": candidate_id, "version": 1} for candidate_id in selected_ids],
        ).model_dump(mode="json")

        # All membership, idempotency, intake, and target item reads precede writes.
        for candidate, item_ref in zip(command.candidates, item_refs, strict=True):
            item = candidate.model_dump(mode="json", exclude={"candidate_id"})
            item.update(
                item_id=candidate.candidate_id,
                household_id=principal.household_id,
                version=1,
                source="USER",
                confirmed_by=principal.uid,
                observed_at=observed_at,
            )
            transaction.create(item_ref, item)

        transaction.update(
            intake_ref,
            {"status": status_value, "version": next_version, "candidates": result["candidates"]},
        )
        transaction.set(
            idem_ref,
            {
                "payload_hash": payload_hash,
                "result": result,
                "created_at": observed_at,
                "actor_uid": principal.uid,
            },
        )
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The intake confirmation could not be saved.", 503, True) from exc
