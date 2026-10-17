from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.domain.repository import (
    _assert_member_in_transaction,
    _idempotency_ref,
    _payload_hash,
    _prior_result,
    _stored_version,
)
from app.schemas.shopping_archive import ArchiveShoppingEntryCommand


def archive_shopping_entry(principal: Principal, command: ArchiveShoppingEntryCommand) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    entry_ref = household.collection("shopping_entries").document(command.entry_id)
    idem_ref = _idempotency_ref(household, "shopping-archive", command.idempotency_key, principal.uid)
    payload_hash = _payload_hash(command)
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous

        snapshot = entry_ref.get(transaction=transaction)
        if not snapshot.exists:
            raise DomainError("NOT_FOUND", "The shopping entry is not available in this household.", 404)
        current = snapshot.to_dict() or {}
        if current.get("household_id") != principal.household_id:
            raise DomainError("DATA_UNAVAILABLE", "The shopping entry has an invalid household scope.", 503)
        current_version = _stored_version(current)
        if current_version != command.base_version:
            raise DomainError("VERSION_CONFLICT", "The shopping entry changed. Reload it before removing it.", 409)
        if current.get("archived") is True:
            raise DomainError("VERSION_CONFLICT", "The shopping entry is already removed from the active list.", 409)

        archived_version = command.base_version + 1
        transaction.update(entry_ref, {
            "archived": True,
            "version": archived_version,
            "updated_by": principal.uid,
            "updated_at": now,
        })
        result = {"entry_id": command.entry_id, "version": archived_version, "archived": True}
        transaction.set(idem_ref, {
            "payload_hash": payload_hash,
            "result": result,
            "created_at": now,
            "actor_uid": principal.uid,
        })
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The shopping entry could not be removed.", 503, True) from exc
