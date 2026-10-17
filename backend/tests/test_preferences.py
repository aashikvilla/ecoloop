"""Focused preference boundary tests; no Firebase client or local env is loaded."""

from __future__ import annotations

import copy
import sys
import types
import unittest
from unittest.mock import patch

from app.core.errors import DomainError


# Import the domain against an inert Firestore module so Settings never reads
# developer env files and the tests cannot contact a cloud project.
firestore_stub = types.ModuleType("app.core.firestore")
firestore_stub.get_firestore = lambda: None
sys.modules["app.core.firestore"] = firestore_stub

from app.domain import preferences  # noqa: E402
from app.schemas.preferences import DeletePreferenceCommand, PreferenceCommand  # noqa: E402


class Snapshot:
    def __init__(self, reference, data):
        self.reference = reference
        self.id = reference.path[-1]
        self.data = data
        self.exists = data is not None

    def to_dict(self):
        return copy.deepcopy(self.data)


class Document:
    def __init__(self, db, path):
        self.db = db
        self.path = path

    def collection(self, name):
        return Collection(self.db, self.path + (name,))

    def get(self, transaction=None):
        return Snapshot(self, copy.deepcopy(self.db.data.get(self.path)))


class Collection:
    def __init__(self, db, path, status=None, maximum=None):
        self.db = db
        self.path = path
        self.status = status
        self.maximum = maximum

    def document(self, name):
        return Document(self.db, self.path + (name,))

    def where(self, field, operator, value):
        assert (field, operator) == ("status", "==")
        return Collection(self.db, self.path, value, self.maximum)

    def limit(self, maximum):
        return Collection(self.db, self.path, self.status, maximum)

    def stream(self, transaction=None):
        rows = [(path, data) for path, data in self.db.data.items() if path[:-1] == self.path and (self.status is None or data.get("status") == self.status)]
        for path, data in rows[: self.maximum]:
            yield Snapshot(Document(self.db, path), copy.deepcopy(data))


class Transaction:
    def __init__(self, db):
        self.db = db

    def set(self, reference, data):
        self.db.data[reference.path] = copy.deepcopy(data)


class Database:
    def __init__(self):
        self.data = {}

    def collection(self, name):
        return Collection(self, (name,))

    def transaction(self):
        return Transaction(self)


class PreferenceTests(unittest.TestCase):
    def setUp(self):
        self.db = Database()
        self.uid = "person-A"
        self.preference_id = "1234567890abcdef"
        self.get_db = patch.object(preferences, "get_firestore", return_value=self.db)
        self.transactional = patch.object(preferences.firestore, "transactional", lambda function: function)
        self.get_db.start()
        self.transactional.start()

    def tearDown(self):
        self.transactional.stop()
        self.get_db.stop()

    def command(self, *, text="Prefer vegetarian dinners", key="12345678-1234-1234", base=0, consent=True):
        return PreferenceCommand(idempotency_key=key, base_version=base, text=text, consent=consent)

    def test_consent_and_private_scope(self):
        with self.assertRaises(DomainError) as denied:
            preferences.change_preference(self.uid, self.preference_id, self.command(consent=False), delete=False)
        self.assertEqual(denied.exception.status_code, 422)
        saved = preferences.change_preference(self.uid, self.preference_id, self.command(), delete=False)
        self.assertEqual(saved["version"], 1)
        self.assertEqual([item["text"] for item in preferences.list_preferences(self.uid)], ["Prefer vegetarian dinners"])
        self.assertEqual(preferences.list_preferences("person-B"), [])

    def test_replay_conflict_correction_and_delete(self):
        create = self.command()
        first = preferences.change_preference(self.uid, self.preference_id, create, delete=False)
        self.assertEqual(preferences.change_preference(self.uid, self.preference_id, create, delete=False), first)
        with self.assertRaises(DomainError) as reused:
            preferences.change_preference(self.uid, self.preference_id, self.command(text="Different", key=create.idempotency_key), delete=False)
        self.assertEqual(reused.exception.status_code, 409)
        with self.assertRaises(DomainError) as stale:
            preferences.change_preference(self.uid, self.preference_id, self.command(key="abcdef12-1234-1234"), delete=False)
        self.assertEqual(stale.exception.status_code, 409)
        corrected = preferences.change_preference(self.uid, self.preference_id, self.command(text="No peanuts", key="fedcba12-1234-1234", base=1), delete=False)
        self.assertEqual(corrected["version"], 2)
        removal = DeletePreferenceCommand(idempotency_key="aaaaaaaa-bbbb-cccc", base_version=2)
        deleted = preferences.change_preference(self.uid, self.preference_id, removal, delete=True)
        self.assertEqual(deleted["status"], "REVOKED")
        self.assertIsNone(deleted["text"])
        self.assertEqual(preferences.change_preference(self.uid, self.preference_id, removal, delete=True), deleted)
        self.assertEqual(preferences.list_preferences(self.uid), [])


if __name__ == "__main__":
    unittest.main()
