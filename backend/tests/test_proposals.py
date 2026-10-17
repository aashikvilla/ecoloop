import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.core.errors import DomainError
from app.core.identity import Principal
from app.domain.proposals import apply_proposal_action, persist_turn
from app.schemas.household import AssistantEnvelope, AssistantTurnRequest, BuyCheckCard
from app.schemas.proposals import ProposalActionCommand


def snapshot(data=None):
    return SimpleNamespace(exists=data is not None, to_dict=lambda: data)


def fake_store(receipt=None, prior=None, member=None):
    db = MagicMock()
    household = db.collection.return_value.document.return_value
    refs = {
        "member": household.collection.return_value.document.return_value,
        "receipt": MagicMock(),
        "idem": MagicMock(),
        "entry": MagicMock(),
        "turn": MagicMock(),
    }
    collections = {
        "members": SimpleNamespace(document=lambda _id: refs["member"]),
        "assistant_proposals": SimpleNamespace(document=lambda _id: refs["receipt"]),
        "idempotency": SimpleNamespace(document=lambda _id: refs["idem"]),
        "shopping_entries": SimpleNamespace(document=lambda _id: refs["entry"]),
        "assistant_users": SimpleNamespace(document=lambda _id: SimpleNamespace(collection=lambda _name: SimpleNamespace(document=lambda _turn_id: refs["turn"]))),
    }
    household.collection.side_effect = lambda name: collections[name]
    refs["member"].get.return_value = snapshot(member if member is not None else {"uid": "owner", "status": "ACTIVE", "role": "OWNER"})
    refs["receipt"].get.return_value = snapshot(receipt)
    refs["idem"].get.return_value = snapshot(prior)
    refs["entry"].get.return_value = snapshot()
    refs["entry"].id = "ai:proposal"
    transaction = MagicMock()
    db.transaction.return_value = transaction
    return db, refs, transaction


def card():
    return BuyCheckCard(
        proposal_id="model-id", type="BuyCheck", version=1, base_version=0,
        source_refs=[], allowed_actions=["ADD"], simulated=True,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        item_name="Tomatoes", stock_state="NOT_FOUND", shopping_action="ADD",
    )


class ProposalActionTests(unittest.TestCase):
    def setUp(self):
        self.principal = Principal(uid="owner", household_id="home", role="OWNER")
        self.command = ProposalActionCommand(idempotency_key="retry-123", base_version=1, action="ADD")
        self.receipt = {
            "actor_uid": "owner", "household_id": "home", "turn_id": "turn-1",
            "status": "PENDING", "version": 1,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "card": card().model_dump(mode="json"),
        }

    def test_explicit_add_writes_list_and_resolution_atomically(self):
        db, refs, transaction = fake_store(self.receipt)
        with patch("app.domain.proposals.get_firestore", return_value=db), patch("app.domain.proposals.firestore.transactional", side_effect=lambda fn: fn):
            result = apply_proposal_action(self.principal, "proposal", self.command)
        self.assertEqual(result["status"], "APPROVED")
        self.assertEqual(result["entry_id"], "ai:proposal")
        entry = next(call.args[1] for call in transaction.create.call_args_list if call.args[0] is refs["entry"])
        self.assertEqual(entry["item_name"], "Tomatoes")
        self.assertIsNone(entry["desired_amount"])
        self.assertNotIn("food_observations", [call.args[0] for call in db.collection.call_args_list])
        transaction.update.assert_any_call(refs["receipt"], {"status": "APPROVED", "version": 2, "resolved_at": result_time(transaction), "resolved_by": "owner"})

    def test_foreign_creator_cannot_act(self):
        receipt = {**self.receipt, "actor_uid": "someone-else"}
        db, _, transaction = fake_store(receipt)
        with patch("app.domain.proposals.get_firestore", return_value=db), patch("app.domain.proposals.firestore.transactional", side_effect=lambda fn: fn):
            with self.assertRaises(DomainError) as context:
                apply_proposal_action(self.principal, "proposal", self.command)
        self.assertEqual(context.exception.status_code, 404)
        transaction.create.assert_not_called()

    def test_stale_version_rejected_before_write(self):
        db, _, transaction = fake_store({**self.receipt, "version": 2})
        with patch("app.domain.proposals.get_firestore", return_value=db), patch("app.domain.proposals.firestore.transactional", side_effect=lambda fn: fn):
            with self.assertRaises(DomainError) as context:
                apply_proposal_action(self.principal, "proposal", self.command)
        self.assertEqual(context.exception.status_code, 409)
        transaction.create.assert_not_called()

    def test_inactive_membership_denies_before_receipt_read(self):
        db, refs, transaction = fake_store(self.receipt, member={"uid": "owner", "status": "REVOKED", "role": "OWNER"})
        with patch("app.domain.proposals.get_firestore", return_value=db), patch("app.domain.proposals.firestore.transactional", side_effect=lambda fn: fn):
            with self.assertRaises(DomainError) as context:
                apply_proposal_action(self.principal, "proposal", self.command)
        self.assertEqual(context.exception.status_code, 403)
        refs["receipt"].get.assert_not_called()
        transaction.create.assert_not_called()

    def test_retry_key_replays_saved_result_without_second_write(self):
        db, refs, transaction = fake_store(self.receipt)
        with patch("app.domain.proposals.get_firestore", return_value=db), patch("app.domain.proposals.firestore.transactional", side_effect=lambda fn: fn):
            original = apply_proposal_action(self.principal, "proposal", self.command)
            stored = next(call.args[1] for call in transaction.create.call_args_list if call.args[0] is refs["idem"])
            refs["idem"].get.return_value = snapshot(stored)
            transaction.reset_mock()
            replay = apply_proposal_action(self.principal, "proposal", self.command)
        self.assertEqual(replay, original)
        refs["receipt"].get.assert_called_once()
        transaction.create.assert_not_called()

    def test_model_card_id_is_replaced_before_persistence(self):
        db, _, transaction = fake_store()
        envelope = AssistantEnvelope(request_id="req", message="Check your list", cards=[card()])
        request = AssistantTurnRequest(text="Should I buy tomatoes?")
        with patch("app.domain.proposals.get_firestore", return_value=db), patch("app.domain.proposals.firestore.transactional", side_effect=lambda fn: fn):
            saved = persist_turn(self.principal, request, envelope)
        self.assertNotEqual(saved.cards[0].proposal_id, "model-id")
        self.assertEqual(saved.cards[0].version, 1)
        self.assertEqual(transaction.create.call_count, 2)


def result_time(transaction):
    return transaction.update.call_args_list[0].args[1]["resolved_at"]


if __name__ == "__main__":
    unittest.main()
