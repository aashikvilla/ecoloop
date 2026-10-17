"""Exercise the real local API with a disposable Firebase user and labelled demo data.

No credentials are saved or printed. Requires ADC and ECOLOOP_PUBLIC_API_KEY
(the Firebase web configuration key, not a service-account secret).
"""
from __future__ import annotations

import argparse
import json
import os
import secrets
from datetime import datetime, timezone
from uuid import uuid4

import firebase_admin
from firebase_admin import auth
import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--ai", action="store_true", help="Make one bounded real Gemini request after database checks")
    parser.add_argument("--origin", default="http://127.0.0.1:8001")
    args = parser.parse_args()
    if not args.apply:
        print("Dry run: creates one labelled Firebase test user, household and pantry through the real API.")
        return
    if args.origin != "http://127.0.0.1:8001":
        raise ValueError("This acceptance runner is restricted to the local API on port 8001.")
    key = os.environ["ECOLOOP_PUBLIC_API_KEY"]
    project = "ecoloop-staging-20261015"
    run = uuid4().hex[:12]
    email = f"local-demo-{run}@ecoloop.example"
    password = secrets.token_urlsafe(24)
    app = firebase_admin.initialize_app(options={"projectId": project})
    user = auth.create_user(email=email, password=password, display_name="Synthetic local acceptance", app=app)
    with httpx.Client(timeout=70) as client:
        signed = client.post("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword", params={"key": key}, json={"email": email, "password": password, "returnSecureToken": True})
        signed.raise_for_status()
        headers = {"Authorization": f"Bearer {signed.json()['idToken']}"}
        evidence: list[dict] = []

        def request(method: str, path: str, payload=None, expected=200):
            response = client.request(method, args.origin + "/api/v1/" + path, headers=headers, json=payload)
            evidence.append({"operation": method + " " + path, "status": response.status_code, "expected": expected})
            if response.status_code != expected:
                # API failures are sanitized at the server boundary; never print auth responses.
                raise RuntimeError(json.dumps({"evidence": evidence, "api_error": response.json()}))
            return response.json()

        household = request("POST", "households", {"schema_version": 1, "idempotency_key": uuid4().hex, "name": "Demo acceptance " + run}, 201)["result"]["household_id"]
        mine = request("GET", "households")["result"]["households"]
        assert any(row["household_id"] == household for row in mine), "Created household is absent from the signed-in account list"
        headers["X-Household-ID"] = household
        foods = [("tomatoes", "Tomatoes", 6, "pieces", "fridge"), ("spinach", "Spinach", 200, "g", "fridge"), ("rice", "Rice", 1, "kg", "pantry"), ("lentils", "Lentils", 500, "g", "pantry"), ("onions", "Onions", 4, "pieces", "pantry"), ("carrots", "Carrots", 6, "pieces", "fridge"), ("oats", "Oats", 500, "g", "pantry"), ("yogurt", "Yogurt", 400, "g", "fridge")]
        command = {"schema_version": 1, "idempotency_key": uuid4().hex, "observations": [{"item_id": "demo-" + item, "base_version": 0, "name": name, "amount": amount, "unit": unit, "storage": storage} for item, name, amount, unit, storage in foods]}
        first = request("POST", "facts/confirm", command)
        replay = request("POST", "facts/confirm", command)
        assert first["result"] == replay["result"], "Exact retry changed the recorded result"
        stale = dict(command, idempotency_key=uuid4().hex)
        request("POST", "facts/confirm", stale, 409)
        kitchen = request("GET", "kitchen")["result"]["observations"]
        assert len(kitchen) == len(foods), "Duplicate canonical items"
        shopping = {"schema_version": 1, "idempotency_key": uuid4().hex, "entry": {"entry_id": "demo-lemons", "base_version": 0, "item_name": "Lemons", "desired_amount": 2, "unit": "pieces"}}
        request("POST", "shopping", shopping)
        request("POST", "shopping", shopping)
        assert len(request("GET", "shopping")["result"]["entries"]) == 1
        archive = {"schema_version": 1, "idempotency_key": uuid4().hex, "entry_id": "demo-lemons", "base_version": 1, "archived": True}
        archived = request("PATCH", "shopping/demo-lemons", archive)["result"]
        assert archived["archived"] is True and archived["version"] == 2
        assert request("PATCH", "shopping/demo-lemons", archive)["result"] == archived
        assert request("GET", "shopping")["result"]["entries"] == []
        outcome = {"schema_version": 1, "idempotency_key": uuid4().hex, "outcome_id": "demo-used-tomatoes", "item_id": "demo-tomatoes", "base_version": 1, "outcome_type": "USED", "amount": 2, "unit": "pieces", "measurement_basis": "USER_ESTIMATED", "occurred_at": datetime.now(timezone.utc).isoformat()}
        request("POST", "outcomes", outcome)
        request("POST", "outcomes", outcome)
        updated = request("GET", "kitchen")["result"]["observations"]
        assert next(item for item in updated if item["item_id"] == "demo-tomatoes")["amount"] == 4
        request("GET", "activity")
        headers["X-Household-ID"] = "judge-demo-household"
        request("GET", "kitchen", expected=403)
        if args.ai:
            headers["X-Household-ID"] = household
            ai = client.post(args.origin + "/api/v1/assistant/proposals/turns", headers=headers, json={"schema_version": 1, "text": "I want to make tomato and spinach pasta, but pasta is not in the confirmed pantry. If it is missing, suggest adding pasta to the shopping list using a BuyCheck card. Keep quantities and freshness unknown unless records provide them.", "session_id": "local-demo-" + run, "context_item_ids": ["demo-spinach", "demo-tomatoes"]})
            evidence.append({"operation": "POST assistant/proposals/turns (real provider + durable receipt)", "status": ai.status_code, "expected": 200})
            if ai.status_code != 200:
                raise RuntimeError(json.dumps({"evidence": evidence, "ai_error": ai.json()}))
            envelope = ai.json()
            if not isinstance(envelope.get("cards"), list):
                raise RuntimeError("Assistant response did not contain validated typed cards")
            evidence[-1]["validated_cards"] = len(envelope["cards"])
            history = request("GET", "assistant/proposals/history")["result"]["turns"]
            assert any(turn["user_text"].startswith("I want to make tomato and spinach pasta") for turn in history), "Durable private assistant turn is missing"
            buy = next((card for card in envelope["cards"] if card.get("type") == "BuyCheck" and card.get("shopping_action") == "ADD" and "ADD" in card.get("allowed_actions", [])), None)
            if buy:
                action = {"schema_version": 1, "idempotency_key": uuid4().hex, "base_version": buy["version"], "action": "ADD"}
                approved = request("POST", f"assistant/proposals/{buy['proposal_id']}/actions", action)["result"]
                replay = request("POST", f"assistant/proposals/{buy['proposal_id']}/actions", action)["result"]
                assert approved == replay and approved["status"] == "APPROVED", "Proposal approval retry was not idempotent"
                entries = request("GET", "shopping")["result"]["entries"]
                assert any(entry["entry_id"] == approved["entry_id"] for entry in entries), "Approved proposal is missing from the shopping list"
                evidence.append({"operation": "explicit BuyCheck ADD + exact retry + shopping readback", "status": 200, "expected": 200})
            else:
                evidence.append({"operation": "explicit BuyCheck ADD", "status": "not offered by model", "expected": "typed card is conditional"})
        print(json.dumps({"project": project, "synthetic": True, "uid": user.uid, "household_id": household, "checks": evidence}, indent=2))


if __name__ == "__main__":
    main()
