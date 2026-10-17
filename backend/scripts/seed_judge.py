"""Create a synthetic judge account and facts; never reset existing records."""
import argparse
import os
from datetime import datetime, timedelta, timezone

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
    food_rows = [
        ("judge-tomatoes", "Tomatoes", 6, "pieces", "fridge", "USER_TARGET", 2),
        ("judge-spinach", "Spinach", 200, "g", "fridge", "BEST_BEFORE", 1),
        ("judge-rice", "Rice", 1, "kg", "pantry", None, None),
        ("judge-lentils", "Lentils", 500, "g", "pantry", None, None),
        ("judge-onions", "Onions", 4, "pieces", "pantry", None, None),
        ("judge-carrots", "Carrots", 6, "pieces", "fridge", None, None),
        ("judge-oats", "Oats", 500, "g", "pantry", None, None),
        ("judge-yogurt", "Yogurt", 400, "g", "fridge", "USE_BY", 3),
        ("judge-chickpeas", "Chickpeas", 400, "g", "pantry", None, None),
        ("judge-potatoes", "Potatoes", 6, "pieces", "pantry", None, None),
    ]
    food_collection = root.collection("food_observations")
    for item_id, name, amount, unit, storage, date_type, days_until in food_rows:
        ref = food_collection.document(item_id)
        date_value = (now.date() + timedelta(days=days_until)).isoformat() if days_until is not None else None
        value = {
            "item_id": item_id, "name": name, "amount": amount, "unit": unit,
            "storage": storage, "source": "USER",
            "date_type": date_type or "UNKNOWN", "date_value": date_value,
            "date_source": "USER" if date_value else None, "version": 1,
            "household_id": HOUSEHOLD, "confirmed_by": UID, "observed_at": now,
            "synthetic": True,
        }
        docs.append((ref, value))

    for entry_id, item_name, amount, unit in [
        ("judge-shopping-garlic", "Garlic", 2, "bulbs"),
        ("judge-shopping-lemons", "Lemons", 4, "pieces"),
        ("judge-shopping-milk", "Milk", 1, "litre"),
        ("judge-shopping-coriander", "Coriander", 1, "bunch"),
        ("judge-shopping-coconut", "Coconut", 1, "piece"),
    ]:
        docs.append((root.collection("shopping_entries").document(entry_id), {
            "entry_id": entry_id, "household_id": HOUSEHOLD,
            "item_name": item_name, "desired_amount": amount, "unit": unit,
            "version": 1, "updated_by": UID, "updated_at": now, "synthetic": True,
        }))

    for plan_id, title, servings, ingredients in [
        ("judge-plan-spinach-tomato", "Spinach and tomato skillet", 2, [
            {"item_id": "judge-spinach", "name": "Spinach", "amount": 100, "unit": "g", "uncertain": False, "quantity_basis": "ASSISTANT_ESTIMATE"},
            {"item_id": "judge-tomatoes", "name": "Tomatoes", "amount": 2, "unit": "pieces", "uncertain": False, "quantity_basis": "ASSISTANT_ESTIMATE"},
        ]),
        ("judge-plan-chickpea-rice", "Chickpea rice bowls", 3, [
            {"item_id": "judge-chickpeas", "name": "Chickpeas", "amount": 240, "unit": "g", "uncertain": False, "quantity_basis": "ASSISTANT_ESTIMATE"},
            {"item_id": "judge-rice", "name": "Rice", "amount": 180, "unit": "g", "uncertain": False, "quantity_basis": "ASSISTANT_ESTIMATE"},
        ]),
        ("judge-plan-lentil-soup", "Lentil and carrot soup", 4, [
            {"item_id": "judge-lentils", "name": "Lentils", "amount": 250, "unit": "g", "uncertain": False, "quantity_basis": "ASSISTANT_ESTIMATE"},
            {"item_id": "judge-carrots", "name": "Carrots", "amount": None, "unit": None, "uncertain": True, "quantity_basis": "UNKNOWN"},
        ]),
    ]:
        docs.append((root.collection("meal_plans").document(plan_id), {
            "plan_id": plan_id, "household_id": HOUSEHOLD, "title": title,
            "servings": servings, "preparation_stage": "NOT_STARTED",
            "ingredients": ingredients, "version": 1,
            "approved_by": UID, "created_by": UID,
            "created_at": now, "updated_at": now, "synthetic": True,
        }))
    created = 0
    updated = 0
    for ref, value in docs:
        try:
            ref.create(value)
            created += 1
        except AlreadyExists:
            existing = ref.get()
            current = existing.to_dict() or {}
            # Refresh only records previously written by this synthetic seeder.
            # Existing real/user data is never changed by rerunning the script.
            if (
                ref.parent.id == "food_observations"
                and current.get("synthetic") is True
                and current.get("date_value") is None
                and value.get("date_value") is not None
            ):
                value["version"] = int(current.get("version", 1)) + 1
                ref.update({key: value[key] for key in ("date_type", "date_value", "date_source", "version", "observed_at")})
                updated += 1
    if not all(ref.get().exists for ref, _ in docs):
        raise RuntimeError("Seed readback did not find all expected documents.")
    print(f"Synthetic seed verified: {created} new documents, {updated} synthetic facts refreshed; {len(docs)} expected paths.")
    print(f"Household ID: {HOUSEHOLD}. Existing stock and memberships were not overwritten.")
    print("Auth user was not created (--data-only)." if args.data_only else
          "Password configured for operator-supplied sign-in." if password else
          "Existing login credentials unchanged; set ECOLOOP_JUDGE_PASSWORD only to configure a password.")


if __name__ == "__main__":
    main()
