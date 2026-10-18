"""Idempotently prepare synthetic Bengaluru AI-demo kitchens and non-claimable offers.

Run from backend with the configured Firebase project and four demo password values
in ignored backend/.env. This seed never declares offer safety or storage as verified.
"""
from __future__ import annotations

import re
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import firebase_admin
from dotenv import dotenv_values
from firebase_admin import auth, firestore
from google.api_core.exceptions import AlreadyExists


PROJECT = "ecoloop-staging-20261015"
ZONE = ZoneInfo("Asia/Kolkata")
NGO_ORG_ID = "uucRT4SyjWt72RqN8TmQ"
ROOT = Path(__file__).resolve().parents[1]

# The first two accounts and Kitchen IDs already exist and are never reset here.
PEOPLE = [
    {"key": "consumer", "email": "consumer.demo@ecoloop.example", "display": "EcoLoop Demo Consumer", "household": "ecoloop-consumer-demo-household", "home": "EcoLoop Consumer Demo Home", "area": "MG Road", "lat": 12.9750, "lon": 77.6050, "existing": True},
    {"key": "vasanth", "email": "donor.vasanth@ecoloop.example", "display": "Vasanth Demo Donor", "household": "359d769ffd334fa39f6dfb2dd63690ac", "home": "EcoLoop Donor Vasanth Nagar Home", "area": "Vasanth Nagar", "lat": 12.9910, "lon": 77.5880, "existing": True},
    {"key": "asha", "email": "donor.asha@ecoloop.example", "display": "Asha Demo Donor", "household": "ecoloop-demo-asha-household", "home": "Asha Demo Kitchen · Jayanagar", "area": "Jayanagar", "lat": 12.9250, "lon": 77.5800},
    {"key": "kiran", "email": "donor.kiran@ecoloop.example", "display": "Kiran Demo Donor", "household": "ecoloop-demo-kiran-household", "home": "Kiran Demo Kitchen · Malleshwaram", "area": "Malleshwaram", "lat": 13.0030, "lon": 77.5700},
    {"key": "meera", "email": "donor.meera@ecoloop.example", "display": "Meera Demo Donor", "household": "ecoloop-demo-meera-household", "home": "Meera Demo Kitchen · Basavanagudi", "area": "Basavanagudi", "lat": 12.9410, "lon": 77.5680},
    {"key": "ananya", "email": "donor.ananya@ecoloop.example", "display": "Ananya Demo Donor", "household": "ecoloop-demo-ananya-household", "home": "Ananya Demo Kitchen · Richmond Town", "area": "Richmond Town", "lat": 12.9640, "lon": 77.6010},
]

# id, name, amount, unit, storage, date type, days to reminder/date.
KITCHENS = {
    "consumer": [
        ("bread", "Bread", 1, "loaf", "ambient", "USER_TARGET", 1),
        ("spinach", "Spinach", 250, "g", "fridge", "USER_TARGET", 2),
        ("tomatoes", "Tomatoes", 4, "pieces", "fridge", "USER_TARGET", 4),
        ("paneer", "Paneer", 200, "g", "fridge", "USE_BY", 2),
        ("onion", "Onion", 3, "pieces", "pantry", "UNKNOWN", None),
        ("garlic", "Garlic", 1, "bulb", "pantry", "UNKNOWN", None),
        ("coriander", "Coriander", 1, "bunch", "fridge", "BEST_BEFORE", 2),
        ("lemon", "Lemon", 2, "pieces", "fridge", "UNKNOWN", None),
        ("olive-oil", "Olive oil", 250, "ml", "pantry", "UNKNOWN", None),
    ],
    "vasanth": [
        ("baby-spinach", "Baby spinach", 250, "g", "fridge", "USER_TARGET", 2),
        ("tomatoes", "Tomatoes", 5, "pieces", "fridge", "BEST_BEFORE", 2),
        ("bread", "Whole wheat bread", 1, "loaf", "ambient", "BEST_BEFORE", 1),
        ("onion", "Red onion", 2, "pieces", "pantry", "UNKNOWN", None),
        ("garlic", "Garlic", 1, "bulb", "pantry", "UNKNOWN", None),
        ("chickpeas", "Cooked chickpeas", 300, "g", "fridge", "UNKNOWN", None),
        ("yogurt", "Plain yogurt", 200, "g", "fridge", "USE_BY", 3),
        ("lemon", "Lemon", 2, "pieces", "fridge", "UNKNOWN", None),
    ],
    "asha": [
        ("spinach", "Spinach", 500, "g", "fridge", "BEST_BEFORE", 2),
        ("tomatoes", "Tomatoes", 6, "pieces", "fridge", "USER_TARGET", 3),
        ("bread", "Multigrain bread", 1, "loaf", "ambient", "BEST_BEFORE", 2),
        ("onion", "Onion", 3, "pieces", "pantry", "UNKNOWN", None),
        ("potatoes", "Potatoes", 700, "g", "pantry", "UNKNOWN", None),
        ("ginger", "Ginger", 100, "g", "fridge", "UNKNOWN", None),
        ("curd", "Curd", 300, "g", "fridge", "USE_BY", 2),
    ],
    "kiran": [
        ("spinach", "Spinach", 600, "g", "fridge", "BEST_BEFORE", 3),
        ("tomatoes", "Tomatoes", 400, "g", "fridge", "USER_TARGET", 2),
        ("potatoes", "Potatoes", 1, "kg", "pantry", "UNKNOWN", None),
        ("onion", "Red onion", 4, "pieces", "pantry", "UNKNOWN", None),
        ("rice", "Rice", 1, "kg", "pantry", "UNKNOWN", None),
        ("moong-dal", "Moong dal", 500, "g", "pantry", "UNKNOWN", None),
        ("milk", "Milk", 500, "ml", "fridge", "USE_BY", 2),
    ],
    "meera": [
        ("spinach", "Spinach", 550, "g", "fridge", "BEST_BEFORE", 2),
        ("tomatoes", "Tomatoes", 500, "g", "fridge", "USER_TARGET", 3),
        ("carrots", "Carrots", 500, "g", "fridge", "USER_TARGET", 2),
        ("lentils", "Toor dal", 500, "g", "pantry", "UNKNOWN", None),
        ("coconut", "Coconut", 1, "piece", "fridge", "UNKNOWN", None),
        ("onion", "Onion", 3, "pieces", "pantry", "UNKNOWN", None),
        ("coriander", "Coriander", 1, "bunch", "fridge", "BEST_BEFORE", 2),
    ],
    "ananya": [
        ("spinach", "Spinach", 500, "g", "fridge", "BEST_BEFORE", 3),
        ("tomatoes", "Tomatoes", 500, "g", "fridge", "USER_TARGET", 2),
        ("paneer", "Paneer", 250, "g", "fridge", "USE_BY", 2),
        ("rice", "Rice", 750, "g", "pantry", "UNKNOWN", None),
        ("onion", "Onion", 3, "pieces", "pantry", "UNKNOWN", None),
        ("garlic", "Garlic", 1, "bulb", "pantry", "UNKNOWN", None),
        ("capsicum", "Capsicum", 2, "pieces", "fridge", "USER_TARGET", 3),
    ],
}


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")


def main() -> None:
    values = dotenv_values(ROOT / ".env")
    app = firebase_admin.initialize_app(options={"projectId": PROJECT})
    db = firestore.client(app=app)
    now = datetime.now(timezone.utc)
    user_by_key: dict[str, Any] = {}
    item_by_name: dict[str, dict[str, dict[str, Any]]] = {}

    for person in PEOPLE:
        if person.get("existing"):
            user = auth.get_user_by_email(person["email"], app=app)
        else:
            password = values.get(f"ECOLOOP_DEMO_PASSWORD_{person['key'].upper()}")
            if not password or len(password) < 16:
                raise RuntimeError(f"Missing configured password for the {person['key']} demo account.")
            try:
                user = auth.get_user_by_email(person["email"], app=app)
                auth.update_user(user.uid, password=password, display_name=person["display"], app=app)
            except auth.UserNotFoundError:
                user = auth.create_user(email=person["email"], password=password, display_name=person["display"], app=app)
        person["uid"] = user.uid
        user_by_key[person["key"]] = user

        home = db.collection("households").document(person["household"])
        if not home.get().exists:
            home.create({"household_id": person["household"], "name": person["home"], "time_zone": "Asia/Kolkata", "synthetic": True, "created_at": now})
        else:
            current = home.get().to_dict() or {}
            if current.get("synthetic") is not True and not person.get("existing"):
                raise RuntimeError(f"Refusing to seed a non-synthetic household: {person['household']}")
            if current.get("synthetic") is not True:
                home.set({"synthetic": True}, merge=True)
        member = home.collection("members").document(user.uid)
        if not member.get().exists:
            member.create({"uid": user.uid, "role": "OWNER", "status": "ACTIVE", "version": 1, "created_at": now, "synthetic": True})

        rows: dict[str, dict[str, Any]] = {}
        collection = home.collection("food_observations")
        for snapshot in collection.stream():
            current = snapshot.to_dict() or {}
            name = current.get("name")
            if isinstance(name, str):
                rows[slug(name)] = current
        item_by_name[person["key"]] = {}
        for suffix, name, amount, unit, storage, date_type, days in KITCHENS[person["key"]]:
            row = rows.get(slug(name))
            if row is None:
                item_id = f"ai-demo-{suffix}"
                date_value = (now.astimezone(ZONE).date() + timedelta(days=days)).isoformat() if days is not None else None
                row = {
                    "item_id": item_id, "name": name, "amount": amount, "unit": unit,
                    "storage": storage, "source": "USER", "date_type": date_type,
                    "date_value": date_value, "date_source": "USER" if date_value else None,
                    "version": 1, "household_id": person["household"], "confirmed_by": user.uid,
                    "observed_at": now, "synthetic": True, "demo_seed": "bengaluru-ai-v1",
                }
                collection.document(item_id).create(row)
                rows[slug(name)] = row
            item_by_name[person["key"]][slug(name)] = row

    # Twelve discoverable planning examples. UNKNOWN suitability/storage is intentional:
    # the API marks them as rehearsal scenarios, and reservation is blocked server-side.
    offer_rows = [
        ("vasanth", "Baby spinach", 250, "g", "greens"), ("vasanth", "Tomatoes", 5, "item", "produce"),
        ("consumer", "Spinach", 250, "g", "greens"), ("consumer", "Tomatoes", 4, "item", "produce"),
        ("asha", "Spinach", 500, "g", "greens"), ("asha", "Tomatoes", 6, "item", "produce"),
        ("kiran", "Spinach", 600, "g", "greens"), ("kiran", "Tomatoes", 400, "g", "produce"),
        ("meera", "Spinach", 550, "g", "greens"), ("meera", "Carrots", 500, "g", "produce"),
        ("ananya", "Spinach", 500, "g", "greens"), ("ananya", "Tomatoes", 500, "g", "produce"),
    ]
    pickup_start = datetime.combine(now.astimezone(ZONE).date() + timedelta(days=1), time(16, 0), ZONE).astimezone(timezone.utc)
    pickup_end = datetime.combine(now.astimezone(ZONE).date() + timedelta(days=1), time(19, 0), ZONE).astimezone(timezone.utc)
    written_offers = 0
    for key, food_name, quantity, unit, tag in offer_rows:
        person = next(entry for entry in PEOPLE if entry["key"] == key)
        source = item_by_name[key].get(slug(food_name))
        if not source:
            raise RuntimeError(f"Missing linked Kitchen item for {person['key']} / {food_name}.")
        offer_id = f"ai-demo-blr-{key}-{slug(food_name)}"
        ref = db.collection("surplus_offers").document(offer_id)
        current_snapshot = ref.get()
        if current_snapshot.exists and (current_snapshot.to_dict() or {}).get("demo_scenario") is not True:
            raise RuntimeError(f"Refusing to overwrite a non-demo offer: {offer_id}")
        value = {
            "offer_id": offer_id,
            "donor": {"kind": "household", "owner_id": person["household"], "creator_uid": person["uid"]},
            "title": f"{food_name} surplus",
            "category": "Fresh produce", "tags": ["vegetarian", tag, "produce"],
            "quantity_total_minor": quantity, "quantity_available_minor": quantity,
            "quantity_reserved_minor": 0, "quantity_collected_minor": 0, "quantity_received_minor": 0,
            "unit": unit, "expiry_declaration": "UNKNOWN", "expiry_at": None,
            "storage_declaration": "UNKNOWN", "condition_declaration": "UNKNOWN",
            "allergen_declaration": "UNKNOWN", "source_kitchen_item_id": source["item_id"],
            "source_kitchen_item_version": source.get("version", 1),
            "pickup_window_start": pickup_start, "pickup_window_end": pickup_end,
            "approximate_area": person["area"], "exact_address": "Synthetic rehearsal point; no real pickup location",
            "latitude": person["lat"], "longitude": person["lon"],
            "pickup_instructions": "Synthetic AI-demo scenario. Do not arrange collection.",
            "media_ids": [], "visibility": "PUBLIC", "status": "OPEN", "version": 1,
            "created_at": now, "updated_at": now, "synthetic": True, "demo_scenario": True,
            "demo_scenario_org_id": NGO_ORG_ID, "demo_seed": "bengaluru-ai-v1",
        }
        if current_snapshot.exists:
            old = current_snapshot.to_dict() or {}
            if old.get("quantity_reserved_minor", 0) or old.get("quantity_collected_minor", 0) or old.get("quantity_received_minor", 0):
                raise RuntimeError(f"Refusing to reset a demo offer with lifecycle activity: {offer_id}")
            value["version"] = int(old.get("version", 1)) + 1
            ref.set(value)
        else:
            ref.create(value)
        written_offers += 1

    # Ensure the saved NGO coordinates used by the exact sample request remain the documented origin.
    org = db.collection("organizations").document(NGO_ORG_ID).get()
    org_data = org.to_dict() if org.exists else None
    if not org_data or not isinstance(org_data.get("pickup_base"), dict):
        raise RuntimeError("The prepared demo NGO has no saved pickup base.")
    print(f"Verified six synthetic kitchens and {written_offers} non-claimable rehearsal offers in {PROJECT}.")
    print("Account passwords were applied from ignored local configuration; no credentials were printed.")
    print(f"Organization pickup base: {org_data['pickup_base'].get('approximate_area')}; rehearsal offers expire from discovery after tomorrow's 19:00 IST pickup window.")


if __name__ == "__main__":
    main()
