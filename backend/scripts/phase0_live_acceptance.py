"""Run bounded Phase 0 live acceptance with synthetic Firebase accounts only.

Requires an explicit --allow-live-writes flag and always attempts targeted cleanup.
Set ECOLOOP_PHASE0_WEB_API_KEY from the public Firebase Web app config in the
calling process. Never pass a production user's token or use real household data.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import threading
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from google.cloud import firestore, storage

from app.schemas.social_impact import (
    DraftSurplusOfferRecord, OfferClaimRecord, OrganizationMembership,
    OrganizationRecord, PickupEventRecord, SurplusOfferRecord,
)


PROJECT_ID = "ecoloop-staging-20261015"
AUTH_ORIGIN = "https://identitytoolkit.googleapis.com/v1"
STORAGE_BUCKET = f"{PROJECT_ID}.firebasestorage.app"


class AcceptanceFailure(RuntimeError):
    pass


def request(method: str, url: str, *, token: str | None = None, body: dict | None = None, headers: dict | None = None) -> tuple[int, dict | str]:
    request_headers = {"Content-Type": "application/json", **(headers or {})}
    if token:
        request_headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
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


def organization_member_id(org_id: str, uid: str) -> str:
    return hashlib.sha256(f"{org_id}\0{uid}".encode("utf-8")).hexdigest()


def scoped_headers(token: str, kind: str, actor_id: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}", "X-Actor-Kind": kind, "X-Actor-Id": actor_id}


def result_value(response: dict) -> dict:
    value = response.get("result") if isinstance(response, dict) else None
    require(isinstance(value, dict), "API returned no canonical result envelope")
    return value


def delete_collection(reference: object) -> None:
    for snapshot in reference.stream():
        snapshot.reference.delete()


def sign_up(origin: str, api_key: str, email: str) -> tuple[str, str]:
    status, result = request(
        "POST",
        f"{origin}/accounts:signUp?key={urllib.parse.quote(api_key, safe='')}",
        body={"email": email, "password": "Phase0-Only!" + uuid4().hex[:12], "returnSecureToken": True},
    )
    require(status == 200 and isinstance(result, dict) and isinstance(result.get("idToken"), str), f"Firebase Auth synthetic sign-up failed: {status}; {result}")
    return result["idToken"], result["localId"]


def delete_auth_user(api_key: str, token: str) -> None:
    status, result = request("POST", f"{AUTH_ORIGIN}/accounts:delete?key={urllib.parse.quote(api_key, safe='')}", body={"idToken": token})
    require(status == 200, f"Firebase Auth cleanup failed: {status}; {result}")


def verify_private_storage(household_id: str, offer_id: str, outsider_token: str) -> None:
    """Prove a real private image exists, reject browser access, then remove it."""
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(STORAGE_BUCKET)
    bucket.reload(timeout=20)
    require(str(bucket.project_number) == "26177403871", "Storage bucket belongs to another project")
    require(bucket.location == "ASIA-SOUTH1", "Storage bucket is in an unexpected region")
    require(bucket.iam_configuration.uniform_bucket_level_access_enabled, "Uniform bucket access is disabled")
    require(bucket.iam_configuration.public_access_prevention == "enforced", "Public access prevention is not enforced")
    object_name = f"private-offer-media/household/{household_id}/{offer_id}/phase0-{uuid4().hex}.png"
    image = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=")
    blob = bucket.blob(object_name)
    try:
        blob.upload_from_string(image, content_type="image/png", if_generation_match=0, timeout=20)
        require(blob.download_as_bytes(timeout=20) == image, "Administrative image readback failed")
        require(not (blob.metadata or {}).get("firebaseStorageDownloadTokens"), "Acceptance image must have no download token")
        encoded = urllib.parse.quote(object_name, safe="")
        firebase_url = f"https://firebasestorage.googleapis.com/v0/b/{STORAGE_BUCKET}/o/{encoded}?alt=media"
        anonymous_code, _ = request("GET", firebase_url)
        foreign_code, _ = request("GET", firebase_url, headers={"Authorization": f"Firebase {outsider_token}"})
        direct_code, _ = request("GET", f"https://storage.googleapis.com/{STORAGE_BUCKET}/{object_name}")
        require(anonymous_code in {401, 403}, f"AC0-07 anonymous Firebase image access was not denied: {anonymous_code}")
        require(foreign_code in {401, 403}, f"AC0-07 unrelated signed-in Firebase image access was not denied: {foreign_code}")
        require(direct_code in {401, 403}, f"AC0-07 direct public GCS image access was not denied: {direct_code}")
        print(f"AC0-07 passed: administrator read 200; anonymous Firebase {anonymous_code}; unrelated Firebase user {foreign_code}; direct GCS {direct_code}.")
    finally:
        if blob.exists(timeout=20):
            blob.reload(timeout=20)
            blob.delete(if_generation_match=blob.generation, timeout=20)
        require(not blob.exists(timeout=20), "Synthetic image cleanup failed")
    print("Storage cleanup verified: the synthetic image is absent from the live bucket.")


def cleanup(db: firestore.Client, api_key: str, users: list[tuple[str, str]], household_ids: set[str], org_ids: set[str], offer_ids: set[str]) -> list[str]:
    failures: list[str] = []
    uids = {uid for _, uid in users}
    uid_values = list(uids)
    if uid_values:
        try:
            household_ids.update(snapshot.id for snapshot in db.collection("households").where("created_by", "in", uid_values).stream())
            org_ids.update((snapshot.to_dict() or {}).get("org_id") for snapshot in db.collection("organization_members").where("uid", "in", uid_values).stream())
            offer_ids.update((snapshot.to_dict() or {}).get("offer_id") for snapshot in db.collection("surplus_offers").where("donor.creator_uid", "in", uid_values).stream())
        except Exception:
            failures.append("synthetic_record_discovery")
        org_ids.discard(None)
        offer_ids.discard(None)
    for offer_id in offer_ids:
        for collection in ("offer_claims", "pickup_events"):
            try:
                delete_collection(db.collection(collection).where("offer_id", "==", offer_id))
            except Exception:
                failures.append(f"{collection}:{offer_id}")
        try:
            db.collection("surplus_offers").document(offer_id).delete()
        except Exception:
            failures.append(f"surplus_offers:{offer_id}")
    for org_id in org_ids:
        try:
            for _, uid in users:
                db.collection("organization_members").document(organization_member_id(org_id, uid)).delete()
            db.collection("organizations").document(org_id).delete()
        except Exception:
            failures.append(f"organizations:{org_id}")
    if uid_values:
        try:
            for snapshot in db.collection("social_impact_idempotency").where("actor_uid", "in", uid_values).stream():
                snapshot.reference.delete()
        except Exception:
            failures.append("social_impact_idempotency")
    for household_id in household_ids:
        household = db.collection("households").document(household_id)
        try:
            for name in ("members", "idempotency"):
                delete_collection(household.collection(name))
            household.delete()
        except Exception:
            failures.append(f"households:{household_id}")
    for _, uid in users:
        actor_scope = hashlib.sha256(uid.encode("utf-8")).hexdigest()
        user_ref = db.collection("users").document(actor_scope)
        try:
            for name in ("household_creation_requests", "household_creation_quotas"):
                delete_collection(user_ref.collection(name))
            user_ref.delete()
        except Exception:
            failures.append(f"users:{actor_scope}")
    for token, uid in users:
        try:
            delete_auth_user(api_key, token)
        except Exception:
            failures.append(f"firebase_auth:{uid}")
    return failures


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--api-origin", required=True)
    parser.add_argument("--allow-live-writes", action="store_true")
    args = parser.parse_args()
    require(args.allow_live_writes, "Live acceptance writes require --allow-live-writes.")
    require(args.project == PROJECT_ID, f"This guarded acceptance runner only permits {PROJECT_ID}.")
    require(not any(os.environ.get(name) for name in ("FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "STORAGE_EMULATOR_HOST")), "Live acceptance cannot use emulator hosts.")
    api_key = os.environ.get("ECOLOOP_PHASE0_WEB_API_KEY", "").strip()
    require(len(api_key) >= 20, "Set ECOLOOP_PHASE0_WEB_API_KEY from the public Firebase Web app config.")
    origin = args.api_origin.rstrip("/")
    require(re.fullmatch(r"https://(?:[a-z0-9-]+---)?ecoloop-api-4wlelpcnca-el\.a\.run\.app", origin) is not None, "API origin must be the project's Cloud Run API service or tagged candidate.")
    code, health = request("GET", origin + "/api/v1/health")
    require(code == 200 and isinstance(health, dict) and health.get("status") in {"ok", "healthy"}, f"Candidate health failed: {code}; {health}")
    api = origin + "/api/v1"
    auth_origin = f"{AUTH_ORIGIN}?key={urllib.parse.quote(api_key, safe='')}"
    run = uuid4().hex[:10]
    db = firestore.Client(project=args.project)
    users: list[tuple[str, str]] = []
    household_ids: set[str] = set()
    org_ids: set[str] = set()
    offer_ids: set[str] = set()
    failures: list[str] = []
    acceptance_error: BaseException | None = None
    accepted_summary: tuple[str, str, str] | None = None

    try:
        donor_token, donor_uid = sign_up(AUTH_ORIGIN, api_key, f"phase0-donor-{run}@example.test")
        users.append((donor_token, donor_uid))
        code, response = request("POST", api + "/households", token=donor_token, body={"schema_version": 1, "idempotency_key": uuid4().hex, "name": "Phase 0 donor " + run})
        require(code == 201, f"AC0-01 household creation failed: {code}; {response}")
        household_id = result_value(response)["household_id"]
        household_ids.add(household_id)
        code, response = request("GET", api + "/households", token=donor_token)
        require(code == 200 and any(row.get("household_id") == household_id for row in result_value(response).get("households", [])), "AC0-01 household discovery failed")
        code, response = request("GET", api + "/kitchen", headers={"Authorization": f"Bearer {donor_token}", "X-Household-ID": household_id})
        require(code == 200 and "observations" in result_value(response), f"AC0-01 authenticated Kitchen read failed: {code}")

        business_token, business_uid = sign_up(AUTH_ORIGIN, api_key, f"phase0-business-{run}@example.test")
        users.append((business_token, business_uid))
        code, response = request("POST", api + "/organizations", token=business_token, headers={"Idempotency-Key": "org-biz-" + run}, body={"type": "business_donor", "name": "Phase 0 Business " + run, "category": "food"})
        require(code == 201, f"Business organization creation failed: {code}; {response}")
        business_id = result_value(response)["organization"]["org_id"]
        org_ids.add(business_id)
        code, _ = request("POST", api + "/offers", headers={**scoped_headers(donor_token, "business", business_id), "Idempotency-Key": "offer-unauth-" + run}, body={"title": "Unauthorized", "category": "food"})
        require(code == 403, f"AC0-02 foreign UID selected a business actor: {code}")
        code, _ = request("GET", api + "/offers/mine", headers=scoped_headers(donor_token, "business", business_id))
        require(code == 403, f"AC0-02 foreign UID read business offers: {code}")

        recipients: list[tuple[str, str, str]] = []
        for index in range(3):
            token, uid = sign_up(AUTH_ORIGIN, api_key, f"phase0-recipient-{index}-{run}@example.test")
            users.append((token, uid))
            code, response = request("POST", api + "/organizations", token=token, headers={"Idempotency-Key": f"org-rec-{index}-{run}"}, body={"type": "recipient_org", "name": f"Phase 0 recipient {index} {run}", "category": "food_bank"})
            require(code == 201, f"Recipient organization creation failed: {code}; {response}")
            org_id = result_value(response)["organization"]["org_id"]
            org_ids.add(org_id)
            recipients.append((token, uid, org_id))
        code, _ = request("GET", api + "/offers", headers=scoped_headers(recipients[0][0], "recipient_org", recipients[0][2]))
        require(code == 403, f"AC0-03 unapproved recipient searched offers: {code}")

        # Test-only approval records model a reviewed operator decision; no self-approval API exists.
        now = datetime.now(timezone.utc)
        for org_id, uid in [(business_id, business_uid), *[(row[2], row[1]) for row in recipients]]:
            OrganizationRecord.model_validate(db.collection("organizations").document(org_id).get().to_dict())
            OrganizationMembership.model_validate(db.collection("organization_members").document(organization_member_id(org_id, uid)).get().to_dict())
        for org_id in (business_id, recipients[0][2], recipients[1][2]):
            db.collection("organizations").document(org_id).update({"verification_status": "APPROVED", "updated_at": now})

        business_headers = scoped_headers(business_token, "business", business_id)
        code, response = request("POST", api + "/offers", headers={**business_headers, "Idempotency-Key": "business-offer-" + run}, body={"title": "Business test offer " + run, "category": "dry_goods"})
        require(code == 201, f"Business offer draft creation failed: {code}; {response}")
        business_offer_id = result_value(response)["offer_id"]
        offer_ids.add(business_offer_id)
        foreign_business_headers = scoped_headers(donor_token, "business", business_id)
        code, _ = request("GET", api + f"/offers/{business_offer_id}", headers=foreign_business_headers)
        require(code in {403, 404}, f"AC0-02 foreign UID read a private business offer: {code}")
        code, _ = request("POST", api + f"/offers/{business_offer_id}/publish", headers={**foreign_business_headers, "Idempotency-Key": "foreign-publish-" + run}, body={"expected_version": 1, "confirmed": True})
        require(code == 403, f"AC0-02 foreign UID published a business offer: {code}")

        donor_headers = scoped_headers(donor_token, "household", household_id)
        code, response = request("POST", api + "/offers", headers={**donor_headers, "Idempotency-Key": "offer-create-" + run}, body={"title": "Lentil packs " + run, "category": "dry_goods"})
        require(code == 201, f"Offer draft creation failed: {code}; {response}")
        offer_id = result_value(response)["offer_id"]
        offer_ids.add(offer_id)
        DraftSurplusOfferRecord.model_validate(db.collection("surplus_offers").document(offer_id).get().to_dict())
        start = datetime.now(timezone.utc) + timedelta(hours=2)
        edit_body = {
            "expected_version": 1, "title": "Lentil packs " + run, "category": "dry_goods",
            "quantity_total_minor": 10, "unit": "package", "expiry_declaration": "UNKNOWN", "expiry_at": None,
            "storage_declaration": "UNKNOWN", "allergen_declaration": "UNKNOWN",
            "pickup_window_start": start.isoformat(), "pickup_window_end": (start + timedelta(hours=3)).isoformat(),
            "approximate_area": "Central district", "exact_address": "House 47, Private Lane, Test City",
            "latitude": 12.9716, "longitude": 77.5946, "pickup_instructions": "Call donor after reservation.",
        }
        code, response = request("PATCH", api + f"/offers/{offer_id}", headers={**donor_headers, "Idempotency-Key": "offer-edit-" + run}, body=edit_body)
        require(code == 200, f"Offer edit failed: {code}; {response}")
        DraftSurplusOfferRecord.model_validate(db.collection("surplus_offers").document(offer_id).get().to_dict())
        code, response = request("POST", api + f"/offers/{offer_id}/publish", headers={**donor_headers, "Idempotency-Key": "offer-pub-" + run}, body={"expected_version": 2, "confirmed": True})
        require(code == 200, f"Offer publication failed: {code}; {response}")
        SurplusOfferRecord.model_validate(db.collection("surplus_offers").document(offer_id).get().to_dict())
        code, _ = request("POST", api + f"/offers/{offer_id}/claims", headers={**scoped_headers(recipients[2][0], "recipient_org", recipients[2][2]), "Idempotency-Key": "pending-claim-" + run}, body={"quantity_minor": 1, "unit": "package", "expected_offer_version": 3})
        require(code == 403, f"AC0-03 unapproved recipient reserved an offer: {code}")

        recipient_headers = scoped_headers(recipients[0][0], "recipient_org", recipients[0][2])
        code, response = request("GET", api + "/offers", headers=recipient_headers)
        public_offers = result_value(response).get("offers", []) if code == 200 else []
        public = next((item for item in public_offers if item.get("offer_id") == offer_id), None)
        require(public is not None, f"Approved recipient search failed: {code}")
        serialized = json.dumps(public)
        require("House 47" not in serialized and "Private Lane" not in serialized and donor_uid not in serialized and "pickup_instructions" not in public and "media_ids" not in public, "AC0-06 public view exposed private fields")

        outsider_token, outsider_uid = sign_up(AUTH_ORIGIN, api_key, f"phase0-outsider-{run}@example.test")
        users.append((outsider_token, outsider_uid))
        code, response = request("POST", api + "/households", token=outsider_token, body={"schema_version": 1, "idempotency_key": uuid4().hex, "name": "Phase 0 outsider " + run})
        require(code == 201, f"Outsider household setup failed: {code}; {response}")
        outsider_household = result_value(response)["household_id"]
        household_ids.add(outsider_household)
        code, _ = request("GET", api + f"/offers/{offer_id}", headers=scoped_headers(outsider_token, "household", outsider_household))
        require(code == 404, f"AC0-02 unrelated household read offer: {code}")
        verify_private_storage(household_id, offer_id, outsider_token)

        claim_bodies = [
            {"quantity_minor": 7, "unit": "package", "expected_offer_version": 3},
            {"quantity_minor": 7, "unit": "package", "expected_offer_version": 3},
        ]
        claim_url = api + f"/offers/{offer_id}/claims"
        claim_headers = [{**scoped_headers(row[0], "recipient_org", row[2]), "Idempotency-Key": f"claim-{i}-{run}"} for i, row in enumerate(recipients[:2])]
        barrier = threading.Barrier(2)

        def attempt(index: int) -> tuple[int, dict | str]:
            barrier.wait(timeout=5)
            return request("POST", claim_url, headers=claim_headers[index], body=claim_bodies[index])

        with ThreadPoolExecutor(max_workers=2) as executor:
            claim_results = list(executor.map(attempt, range(2)))
        accepted = [(index, value) for index, (status, value) in enumerate(claim_results) if status == 201]
        conflicts = [status for status, _ in claim_results if status == 409]
        require(len(accepted) == 1 and conflicts == [409], f"AC0-04 concurrent claims did not yield one 201 and one 409: {claim_results}")
        winner_index, winner_value = accepted[0]
        winner_result = result_value(winner_value)
        code, replay = request("POST", claim_url, headers=claim_headers[winner_index], body=claim_bodies[winner_index])
        require(code == 201 and result_value(replay) == winner_result, "AC0-05 idempotent claim replay changed the result")
        events = list(db.collection("pickup_events").where("offer_id", "==", offer_id).stream())
        offer = db.collection("surplus_offers").document(offer_id).get().to_dict() or {}
        require(len(events) == 1 and offer.get("quantity_reserved_minor") == 7 and offer.get("quantity_available_minor") == 3, "Claim replay duplicated events or over-reserved quantity")
        SurplusOfferRecord.model_validate(offer)
        OfferClaimRecord.model_validate(db.collection("offer_claims").document(winner_result["claim_id"]).get().to_dict())
        PickupEventRecord.model_validate(events[0].to_dict())

        loser_index = 1 - winner_index
        code, _ = request("POST", claim_url, headers={**scoped_headers(recipients[loser_index][0], "recipient_org", recipients[loser_index][2]), "Idempotency-Key": "unit-mismatch-" + run}, body={"quantity_minor": 1, "unit": "portion", "expected_offer_version": 4})
        require(code == 409, f"AC0-08 unsupported unit conversion was accepted: {code}")

        revoked_token, revoked_uid, revoked_org_id = recipients[2]
        db.collection("organizations").document(revoked_org_id).update({"verification_status": "APPROVED"})
        db.collection("organization_members").document(organization_member_id(revoked_org_id, revoked_uid)).update({"status": "REVOKED", "version": 2})
        code, _ = request("GET", api + "/offers", headers=scoped_headers(revoked_token, "recipient_org", revoked_org_id))
        require(code == 403, f"AC0-03 revoked recipient searched offers: {code}")
        code, _ = request("POST", claim_url, headers={**scoped_headers(revoked_token, "recipient_org", revoked_org_id), "Idempotency-Key": "revoked-claim-" + run}, body={"quantity_minor": 1, "unit": "package", "expected_offer_version": 4})
        require(code == 403, f"AC0-03 revoked recipient reserved an offer: {code}")

        accepted_summary = (run, offer_id, winner_result["claim_id"])
    except BaseException as exc:
        acceptance_error = exc
    finally:
        failures = cleanup(db, api_key, users, household_ids, org_ids, offer_ids)

    if failures:
        raise AcceptanceFailure("Synthetic live acceptance cleanup needs attention: " + ", ".join(failures)) from acceptance_error
    if acceptance_error:
        raise acceptance_error
    require(accepted_summary is not None, "No live acceptance summary was recorded.")
    run_id, tested_offer_id, claim_id = accepted_summary
    print("Live Phase 0 acceptance passed: AC0-01 through AC0-08 against Cloud Run, live Firestore and private Firebase Storage.")
    print("Persisted organization, membership, initial/edited draft, published/reserved offer, claim and event schemas validated.")
    print(f"Synthetic run: {run_id}; offer: {tested_offer_id}; accepted claim: {claim_id}.")
    print("Cleanup verified: synthetic Firestore documents and Firebase Auth accounts were removed.")


if __name__ == "__main__":
    main()
