"""Pure schema checks; these fixtures are never application data or fallbacks."""
import unittest
from datetime import datetime, timezone

from pydantic import ValidationError
from app.schemas.household import ConfirmFactsCommand, FoodObservationInput, RecordOutcomeCommand


class HouseholdBoundaries(unittest.TestCase):
    def test_zero_stock_is_valid(self):
        observation = FoodObservationInput(item_id="test-item", base_version=1, name="Tomatoes", amount=0, unit="pieces")
        self.assertEqual(observation.amount, 0)

    def test_boolean_and_negative_amounts_rejected(self):
        for value in (True, False, -1, float("inf")):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                FoodObservationInput(item_id="test-item", base_version=1, name="Tomatoes", amount=value, unit="pieces")

    def test_unknown_date_cannot_have_invented_source(self):
        with self.assertRaises(ValidationError):
            FoodObservationInput(item_id="test-item", base_version=1, name="Tomatoes", date_source="USER")

    def test_duplicate_fact_ids_rejected(self):
        item = {"item_id": "test-item", "base_version": 0, "name": "Tomatoes"}
        with self.assertRaises(ValidationError):
            ConfirmFactsCommand(idempotency_key="test-command-123", observations=[item, item])

    def test_handover_cannot_bypass_share_workflow(self):
        with self.assertRaises(ValidationError):
            RecordOutcomeCommand(idempotency_key="test-command-123", outcome_id="test-outcome", item_id="test-item", base_version=1, outcome_type="HANDED_OVER", occurred_at=datetime.now(timezone.utc))

    def test_known_consumption_requires_measurement_basis(self):
        with self.assertRaises(ValidationError):
            RecordOutcomeCommand(idempotency_key="test-command-123", outcome_id="test-outcome", item_id="test-item", base_version=1, outcome_type="USED", amount=2, unit="pieces", occurred_at=datetime.now(timezone.utc))


if __name__ == "__main__":
    unittest.main()
