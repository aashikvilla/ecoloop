"""Run Phase 0 API acceptance against local Firebase Auth/Firestore/Storage emulators.

Start the API with the emulator environment variables from the Phase 0 runbook.
This script writes only to the emulator project `demo-ecoloop`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import threading
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from google.auth.credentials import AnonymousCredentials
from google.cloud import firestore


PROJECT_ID = "demo-ecoloop"
AUTH_ORIGIN = "http://127.0.0.1:9099"
STORAGE_ORIGIN = "http://127.0.0.1:9199"


def organization_member_id(org_id: str, uid: str) -> str:
    return hashlib.sha256(f"{org_id}\0{uid}".encode("utf-8")).hexdigest()


class AcceptanceFailure(RuntimeError):
    pass


def request(method: str, url: str, *, token: str | None = None, body: dict | None = None, headers: dict | None = None) -> tuple[int, dict | str]:
    request_headers = {"Content-Type": "application/json", **(headers or {})}
    if token:
        request_headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = response.read().decode("utf-8")
            return response.status, json.loads(payload) if payload else {}
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(payload)
        except json.JSONDecodeError:
            return exc.code, payload


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AcceptanceFailure(message)


def sign_up(email: str) -> tuple[str, str]:
    status, result = request(
        "POST",
        f"{AUTH_ORIGIN}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key",
        body={"email": email, "password": "Phase0-Only!" + uuid4().hex[:8], "returnSecureToken": True},
    )
    require(status == 200 and isinstance(result, dict) and isinstance(result.get("idToken"), str), f"Auth emulator sign-up failed: {status}")
    return result["idToken"], result["localId"]


def scoped_headers(token: str, kind: str, actor_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Actor-Kind": kind, "X-Actor-Id": actor_id}


def result_value(response: dict) -> dict:
    value = response.get("result") if isinstance(response, dict) else None
    require(isinstance(value, dict), "API returned no canonical result envelope")
    return value


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-origin", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    origin = args.api_origin.rstrip("/") + "/api/v1"
    run = uuid4().hex[:10]
    db = firestore.Client(project=PROJECT_ID, credentials=AnonymousCredentials())

    # AC0-01: old household create/discovery/auth behavior remains available.
    donor_token, donor_uid = sign_up(f"phase0-donor-{run}@example.test")
    code, response = request("POST", origin + "/households", token=donor_token, body={"schema_version": 1, "idempotency_key": uuid4().hex, "name": "Phase 0 donor " + run})
    require(code == 201, f"Existing household creation regressed: {code}")
    household_id = result_value(response)["household_id"]
    code, response = request("GET", origin + "/households", token=donor_token)
    require(code == 200 and any(row.get("household_id") == household_id for row in result_value(response).get("households", [])), "Household discovery failed")
    code, response = request("GET", origin + "/kitchen", headers={"Authorization": f"Bearer {donor_token}", "X-Household-ID": household_id})
    require(code == 200 and "observations" in result_value(response), f"Existing authenticated household read failed: {code}")

    # P0.1/AC0-02: business and recipient actors require server-owned membership.
    business_token, business_uid = sign_up(f"phase0-business-{run}@example.test")
    business_headers_base = {"Authorization": f"Bearer {business_token}"}
    code, response = request("POST", origin + "/organizations", token=business_token, headers={"Idempotency-Key": "org-biz-" + run}, body={"type": "business_donor", "name": "Phase 0 Business " + run, "category": "food"})
    require(code == 201, f"Business organization creation failed: {code}")
    business = result_value(response)["organization"]
    business_id = business["org_id"]
    code, _ = request("POST", origin + "/offers", headers={**scoped_headers(donor_token, "business", business_id), "Idempotency-Key": "offer-unauth-" + run}, body={"title": "Unauthorized", "category": "food"})
    require(code == 403, f"Foreign UID selected a business actor: {code}")
    code, _ = request("GET", origin + "/offers/mine", headers=scoped_headers(donor_token, "business", business_id))
    require(code == 403, f"Foreign UID read a business offer scope: {code}")

    recipient_tokens: list[tuple[str, str]] = []
    recipient_ids: list[str] = []
    for index in range(3):
        token, uid = sign_up(f"phase0-recipient-{index}-{run}@example.test")
        recipient_tokens.append((token, uid))
        code, response = request("POST", origin + "/organizations", token=token, headers={"Idempotency-Key": f"org-rec-{index}-{run}"}, body={"type": "recipient_org", "name": f"Phase 0 recipient {index} {run}", "category": "food_bank"})
        require(code == 201, f"Recipient organization creation failed: {code}")
        recipient_ids.append(result_value(response)["organization"]["org_id"])
    code, _ = request("GET", origin + "/offers", headers=scoped_headers(recipient_tokens[0][0], "recipient_org", recipient_ids[0]))
    require(code == 403, f"Unapproved recipient organization searched offers: {code}")

    # The test-only manual approval models a reviewed operator decision; the API has no self-approval route.
    db.collection("organizations").document(business_id).update({"verification_status": "APPROVED", "updated_at": datetime.now(timezone.utc)})
    for org_id in recipient_ids:
        db.collection("organizations").document(org_id).update({"verification_status": "APPROVED", "updated_at": datetime.now(timezone.utc)})

    # AC0-06: only donor actor sees the exact address/media IDs.
    donor_headers = scoped_headers(donor_token, "household", household_id)
    code, response = request("POST", origin + "/offers", headers={**donor_headers, "Idempotency-Key": "offer-create-" + run}, body={"title": "Lentil packs " + run, "category": "dry_goods"})
    require(code == 201, f"Donor offer draft creation failed: {code}")
    offer_id = result_value(response)["offer_id"]
    start = datetime.now(timezone.utc) + timedelta(hours=2)
    end = start + timedelta(hours=3)
    edit_body = {
        "expected_version": 1,
        "title": "Lentil packs " + run,
        "category": "dry_goods",
        "quantity_total_minor": 10,
        "unit": "package",
        "expiry_declaration": "UNKNOWN",
        "expiry_at": None,
        "storage_declaration": "UNKNOWN",
        "allergen_declaration": "UNKNOWN",
        "pickup_window_start": start.isoformat(),
        "pickup_window_end": end.isoformat(),
        "approximate_area": "Central district",
        "exact_address": "House 47, Private Lane, Test City",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "pickup_instructions": "Call donor after an accepted reservation.",
    }
    code, response = request("PATCH", origin + f"/offers/{offer_id}", headers={**donor_headers, "Idempotency-Key": "offer-edit-" + run}, body=edit_body)
    require(code == 200, f"Offer edit failed: {code}; {response}")
    code, _ = request("POST", origin + f"/offers/{offer_id}/publish", headers={**donor_headers, "Idempotency-Key": "offer-pub-" + run}, body={"expected_version": 2, "confirmed": True})
    require(code == 200, f"Offer publication failed: {code}")

    public_headers = scoped_headers(recipient_tokens[0][0], "recipient_org", recipient_ids[0])
    code, response = request("GET", origin + "/offers", headers=public_headers)
    public_offers = result_value(response).get("offers", []) if code == 200 else []
    public = next((item for item in public_offers if item.get("offer_id") == offer_id), None)
    require(public is not None, f"Approved recipient could not search published offer: {code}")
    serialized = json.dumps(public)
    require("House 47" not in serialized and "Private Lane" not in serialized and donor_uid not in serialized and "pickup_instructions" not in public and "media_ids" not in public, "Public offer leaked exact location, creator identity, instructions or media IDs")
    other_token, _ = sign_up(f"phase0-outsider-{run}@example.test")
    other_household_code, other_household_response = request("POST", origin + "/households", token=other_token, body={"schema_version": 1, "idempotency_key": uuid4().hex, "name": "Phase 0 outsider " + run})
    require(other_household_code == 201, "Outsider household setup failed")
    other_household_id = result_value(other_household_response)["household_id"]
    code, _ = request("GET", origin + f"/offers/{offer_id}", headers=scoped_headers(other_token, "household", other_household_id))
    require(code == 404, f"Unrelated household read offer with private scope: {code}")

    # AC0-04/05: concurrent over-reservation permits one claim; replay creates one event.
    claim_bodies = [
        {"quantity_minor": 7, "unit": "package", "expected_offer_version": 3},
        {"quantity_minor": 7, "unit": "package", "expected_offer_version": 3},
    ]
    claim_urls = [origin + f"/offers/{offer_id}/claims"] * 2
    claim_headers = [
        {**scoped_headers(recipient_tokens[i][0], "recipient_org", recipient_ids[i]), "Idempotency-Key": f"claim-{i}-{run}"}
        for i in range(2)
    ]
    barrier = threading.Barrier(2)

    def attempt(index: int) -> tuple[int, dict | str]:
        barrier.wait(timeout=5)
        return request("POST", claim_urls[index], headers=claim_headers[index], body=claim_bodies[index])

    with ThreadPoolExecutor(max_workers=2) as executor:
        claim_results = list(executor.map(attempt, range(2)))
    accepted = [(index, value) for index, (code, value) in enumerate(claim_results) if code == 201]
    conflicts = [code for code, _ in claim_results if code == 409]
    require(len(accepted) == 1 and conflicts == [409], f"Concurrent reservation did not yield one 201 and one 409: {claim_results}")
    winner_index, winner_value = accepted[0]
    winner_result = result_value(winner_value)
    code, replay = request("POST", claim_urls[winner_index], headers=claim_headers[winner_index], body=claim_bodies[winner_index])
    require(code == 201 and result_value(replay) == winner_result, "Idempotent claim replay did not return the original canonical result")
    events = list(db.collection("pickup_events").where("offer_id", "==", offer_id).stream())
    require(len(events) == 1 and (events[0].to_dict() or {}).get("event_type") == "RESERVED", "Claim retry created duplicate reservation events")
    updated_offer = db.collection("surplus_offers").document(offer_id).get().to_dict() or {}
    require(updated_offer.get("quantity_reserved_minor") == 7 and updated_offer.get("quantity_available_minor") == 3, "Concurrent claims over-reserved offer quantity")

    # AC0-08: no implicit package-to-portion conversion.
    loser_index = 1 - winner_index
    mismatch_headers = {**scoped_headers(recipient_tokens[loser_index][0], "recipient_org", recipient_ids[loser_index]), "Idempotency-Key": "unit-mismatch-" + run}
    code, _ = request("POST", claim_urls[loser_index], headers=mismatch_headers, body={"quantity_minor": 1, "unit": "portion", "expected_offer_version": 4})
    require(code == 409, f"Unsupported unit conversion was not refused: {code}")

    # AC0-03: revocation denies later discovery and claims even when an earlier context was valid.
    revoked_index = 2
    revoked_org = db.collection("organizations").document(recipient_ids[revoked_index])
    revoked_member = db.collection("organization_members").document(organization_member_id(recipient_ids[revoked_index], recipient_tokens[revoked_index][1]))
    revoked_org.update({"verification_status": "APPROVED"})
    revoked_member.update({"status": "REVOKED", "version": 2})
    revoked_headers = scoped_headers(recipient_tokens[revoked_index][0], "recipient_org", recipient_ids[revoked_index])
    search_code, _ = request("GET", origin + "/offers", headers=revoked_headers)
    claim_code, _ = request("POST", origin + f"/offers/{offer_id}/claims", headers={**revoked_headers, "Idempotency-Key": "revoked-claim-" + run}, body={"quantity_minor": 1, "unit": "package", "expected_offer_version": 4})
    require(search_code == 403 and claim_code == 403, f"Revoked recipient member accessed search/claim: {search_code}/{claim_code}")

    # AC0-07: Storage emulator applies the repository's deny-all rules to anonymous browser access.
    storage_url = f"{STORAGE_ORIGIN}/v0/b/{PROJECT_ID}.appspot.com/o?name=private-offer-media%2Funauthorized%2Fprobe.jpg&uploadType=media"
    storage_code, _ = request("POST", storage_url, token=other_token, body={"probe": "no object data"})
    require(storage_code in {401, 403}, f"Unauthorized Storage emulator request did not fail closed: {storage_code}")

    print("Phase 0 emulator acceptance passed: AC0-01 through AC0-08.")
    print("Project: demo-ecoloop (local Firebase emulators only).")
    print(f"Offer: {offer_id}; accepted concurrent claim: {winner_result['claim_id']}; no production project was changed.")


if __name__ == "__main__":
    main()
