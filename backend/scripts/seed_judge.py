"""Create a synthetic judge account and facts; never reset existing records."""
import argparse
import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import auth, firestore
from google.api_core.exceptions import AlreadyExists

PROJECT = "ecoloop-staging-20261015"
UID = "ecoloop-judge-demo"
HOUSEHOLD = "judge-demo-household"
EMAIL = "judge-demo@ecoloop.example"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write only missing synthetic records")
    parser.add_argument("--data-only", action="store_true", help="Seed facts before Firebase Authentication initialization")
    args = parser.parse_args()
    if not args.apply:
        print(f"Dry run: project={PROJECT}, uid={UID}, household={HOUSEHOLD}; pass --apply to seed.")
        return
    app = firebase_admin.initialize_app(options={"projectId": PROJECT})
    password = os.environ.get("ECOLOOP_JUDGE_PASSWORD")
    if password and len(password) < 16:
        raise ValueError("Choose a judge password of at least 16 characters.")
    if not args.data_only:
        try:
            auth.get_user(UID, app=app)
        except auth.UserNotFoundError:
            fields = {"uid": UID, "email": EMAIL, "display_name": "Synthetic judge demo"}
            if password:
                fields["password"] = password
            auth.create_user(app=app, **fields)
        if password:
            auth.update_user(UID, password=password, app=app)
    db = firestore.client(app=app)
    now = datetime.now(timezone.utc)
    root = db.collection("households").document(HOUSEHOLD)
    docs = [
        (root, {"name": "Synthetic judge kitchen", "time_zone": "Asia/Kolkata", "synthetic": True}),
        (root.collection("members").document(UID), {"uid": UID, "role": "OWNER", "status": "ACTIVE", "created_at": now}),
    ]
    for item_id, name, amount, unit, storage in [
        ("judge-tomatoes", "Tomatoes", 6, "pieces", "fridge"),
        ("judge-spinach", "Spinach", 200, "g", "fridge"),
        ("judge-rice", "Rice", 1, "kg", "pantry"),
        ("judge-lentils", "Lentils", 500, "g", "pantry"),
        ("judge-onions", "Onions", 4, "pieces", "pantry"),
        ("judge-carrots", "Carrots", 6, "pieces", "fridge"),
        ("judge-oats", "Oats", 500, "g", "pantry"),
        ("judge-yogurt", "Yogurt", 400, "g", "fridge"),
        ("judge-chickpeas", "Chickpeas", 400, "g", "pantry"),
        ("judge-potatoes", "Potatoes", 6, "pieces", "pantry"),
    ]:
        docs.append((root.collection("food_observations").document(item_id), {
            "item_id": item_id, "name": name, "amount": amount, "unit": unit,
            "storage": storage, "source": "USER", "date_type": "UNKNOWN",
            "date_value": None, "date_source": None, "version": 1,
            "household_id": HOUSEHOLD, "confirmed_by": UID, "observed_at": now,
            "synthetic": True,
        }))
    created = 0
    for ref, value in docs:
        try:
            ref.create(value)
            created += 1
        except AlreadyExists:
            pass
    if not all(ref.get().exists for ref, _ in docs):
        raise RuntimeError("Seed readback did not find all expected documents.")
    print(f"Synthetic seed verified: {created} new documents; {len(docs)} expected paths.")
    print(f"Household ID: {HOUSEHOLD}. Existing stock and memberships were not overwritten.")
    print("Auth user was not created (--data-only)." if args.data_only else
          "Password configured for operator-supplied sign-in." if password else
          "Existing login credentials unchanged; set ECOLOOP_JUDGE_PASSWORD only to configure a password.")


if __name__ == "__main__":
    main()
