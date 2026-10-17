"""Run bounded managed-context acceptance with disposable synthetic data.

Requires --apply, Application Default Credentials, and the public Firebase web
API key in ECOLOOP_PUBLIC_API_KEY. Never prints auth tokens or passwords.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import secrets
import time
from urllib.parse import urlparse
from uuid import uuid4

import firebase_admin
from firebase_admin import auth, firestore
import httpx
import agentplatform
from google.adk.sessions import VertexAiSessionService


PROJECT = "ecoloop-staging-20261015"
ENGINE_LOCATION = "asia-south1"
ENGINE_ID = "8405027522533654528"
APP_NAME = "ecoloop_household_assistant"
DEFAULT_API_ORIGIN = "https://ai-test---ecoloop-api-4wlelpcnca-el.a.run.app"
API_HOST = re.compile(r"(?:[a-z0-9-]+---)?ecoloop-api-[a-z0-9-]+\.a\.run\.app\Z")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Create disposable synthetic data and perform one AI request")
    parser.add_argument("--api-origin", default=DEFAULT_API_ORIGIN, help="EcoLoop Cloud Run API URL, including a candidate tag if needed")
    args = parser.parse_args()
    if not args.apply:
        print("Dry run: no account, household, provider request, or database write will be made.")
        return

    api_key = os.environ.get("ECOLOOP_PUBLIC_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("ECOLOOP_PUBLIC_API_KEY is not configured in this process.")

    parsed = urlparse(args.api_origin)
    if (
        parsed.scheme != "https"
        or not API_HOST.fullmatch(parsed.hostname or "")
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise SystemExit("--api-origin must be an EcoLoop Cloud Run API URL, not an arbitrary remote host.")
    api_origin = f"https://{parsed.hostname}"

    run_id = uuid4().hex[:12]
    email = f"cloud-ai-demo-{run_id}@ecoloop.example"
    password = secrets.token_urlsafe(32)
    app = firebase_admin.initialize_app(options={"projectId": PROJECT})
    user = None
    household_id = None
    session_id = "cloud-ai-demo-" + run_id
    preference_id = "synthetic-preference-" + run_id
    memory_deleted = False
    session_deleted = False
    managed_user_id = None
    evidence: list[dict[str, object]] = []
    db = firestore.client(app=app)
    session_service = VertexAiSessionService(
        project=PROJECT,
        location=ENGINE_LOCATION,
        agent_engine_id=ENGINE_ID,
    )

    try:
        user = auth.create_user(
            email=email,
            password=password,
            display_name="Synthetic managed context acceptance",
            app=app,
        )
        with httpx.Client(timeout=75) as client:
            signed = client.post(
                "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
                params={"key": api_key},
                json={"email": email, "password": password, "returnSecureToken": True},
            )
            if signed.status_code != 200:
                raise RuntimeError("Firebase sign-in for the synthetic acceptance account failed.")
            headers = {"Authorization": f"Bearer {signed.json()['idToken']}"}

            def request(method: str, path: str, payload: dict | None = None, expected: int = 200) -> dict:
                response = client.request(method, api_origin + "/api/v1/" + path, headers=headers, json=payload)
                evidence.append({"operation": f"{method} {path}", "status": response.status_code, "expected": expected})
                if response.status_code != expected:
                    try:
                        details = response.json()
                    except ValueError:
                        details = {"error": "non-json response"}
                    raise RuntimeError(json.dumps({"checks": evidence, "api_error": details}))
                return response.json()

            household_id = request(
                "POST",
                "households",
                {"schema_version": 1, "idempotency_key": uuid4().hex, "name": "Synthetic AI demo " + run_id},
                201,
            )["result"]["household_id"]
            headers["X-Household-ID"] = household_id
            observations = [
                {"item_id": "demo-tomatoes", "base_version": 0, "name": "Tomatoes", "amount": 6, "unit": "pieces", "storage": "fridge"},
                {"item_id": "demo-spinach", "base_version": 0, "name": "Spinach", "amount": 200, "unit": "g", "storage": "fridge"},
                {"item_id": "demo-rice", "base_version": 0, "name": "Rice", "amount": 1, "unit": "kg", "storage": "pantry"},
                {"item_id": "demo-lentils", "base_version": 0, "name": "Lentils", "amount": 500, "unit": "g", "storage": "pantry"},
            ]
            request("POST", "facts/confirm", {"schema_version": 1, "idempotency_key": uuid4().hex, "observations": observations})
            before_kitchen = request("GET", "kitchen")["result"]["observations"]
            before_shopping = request("GET", "shopping")["result"]["entries"]

            ai = client.post(
                api_origin + "/api/v1/assistant/proposals/turns",
                headers=headers,
                json={
                    "schema_version": 1,
                    "text": "Suggest one easy vegetarian dinner for two using the confirmed tomatoes and spinach. State clearly if an ingredient is not in the confirmed pantry. Keep quantities grounded in the records and do not imply that the food was cooked or eaten.",
                    "session_id": session_id,
                    "context_item_ids": ["demo-tomatoes", "demo-spinach"],
                },
            )
            evidence.append({"operation": "POST assistant turn (Vertex AI + managed Session)", "status": ai.status_code, "expected": 200})
            if ai.status_code != 200:
                try:
                    details = ai.json()
                except ValueError:
                    details = {"error": "non-json response"}
                raise RuntimeError(json.dumps({"checks": evidence, "api_error": details}))
            envelope = ai.json()
            if not isinstance(envelope.get("cards"), list) or not envelope.get("request_id"):
                raise RuntimeError("Assistant did not return the typed response envelope.")

            history = request("GET", "assistant/proposals/history")["result"]["turns"]
            if not any(turn.get("user_text", "").startswith("Suggest one easy vegetarian dinner") for turn in history):
                raise RuntimeError("The AI turn was not persisted in private proposal history.")

            after_kitchen = request("GET", "kitchen")["result"]["observations"]
            after_shopping = request("GET", "shopping")["result"]["entries"]
            if before_kitchen != after_kitchen or before_shopping != after_shopping:
                raise RuntimeError("Assistant generation changed canonical Kitchen or Shopping records.")
            evidence.append({"operation": "Kitchen/Shopping before-after comparison", "status": 200, "expected": 200})

            session_scope = hashlib.sha256(json.dumps([user.uid, household_id], separators=(",", ":")).encode()).hexdigest()
            managed_user_id = f"household:{session_scope}"

            async def read_sessions():
                owned = await session_service.get_session(
                    app_name=APP_NAME,
                    user_id=managed_user_id,
                    session_id=session_id,
                )
                foreign = await session_service.get_session(
                    app_name=APP_NAME,
                    user_id="household:foreign-synthetic-owner",
                    session_id=session_id,
                )
                return owned, foreign

            managed_session, foreign_session = asyncio.run(read_sessions())
            if managed_session is None or not managed_session.events or foreign_session is not None:
                raise RuntimeError("Managed Session readback or foreign-owner isolation failed.")
            evidence.append({"operation": "Agent Engine Session readback + foreign-owner isolation", "status": 200, "expected": 200})

            preference = request("PUT", "preferences/" + preference_id, {
                "schema_version": 1,
                "idempotency_key": uuid4().hex,
                "base_version": 0,
                "text": "Synthetic acceptance preference: vegetarian meals",
                "consent": True,
            })["result"]
            if preference.get("memory_bank_sync", {}).get("status") != "synced":
                raise RuntimeError("Consented synthetic preference did not synchronize to Memory Bank.")
            owner_scope = hashlib.sha256(user.uid.encode("utf-8")).hexdigest()
            expected_memory_id = "p-" + hashlib.sha256(f"{owner_scope}:{preference_id}".encode("utf-8")).hexdigest()[:52]
            engine_name = f"projects/{PROJECT}/locations/{ENGINE_LOCATION}/reasoningEngines/{ENGINE_ID}"
            memory_candidates = agentplatform.Client(project=PROJECT, location=ENGINE_LOCATION).memory_banks.memories.retrieve(
                name=engine_name,
                scope={"app_name": "ecoloop", "user_id": owner_scope},
                similarity_search_params={"search_query": "user-approved household preference", "top_k": 20},
            )
            if not any(
                getattr(candidate, "memory", None)
                and getattr(candidate.memory, "name", "").endswith("/memories/" + expected_memory_id)
                and getattr(candidate.memory, "fact", None) == "User-approved preference: Synthetic acceptance preference: vegetarian meals"
                for candidate in memory_candidates
            ):
                raise RuntimeError("The consented preference could not be retrieved from Memory Bank.")
            evidence.append({"operation": "Agent Platform Memory Bank retrieve + canonical fact match", "status": 200, "expected": 200})

            revoked = request("DELETE", "preferences/" + preference_id, {
                "schema_version": 1,
                "idempotency_key": uuid4().hex,
                "base_version": preference["version"],
            })["result"]
            if revoked.get("memory_bank_sync", {}).get("status") != "synced":
                raise RuntimeError("Memory Bank revocation/deletion was not confirmed.")
            memory_deleted = True
            evidence.append({"operation": "Memory Bank preference create + revoke/delete", "status": 200, "expected": 200})

            async def delete_session():
                await session_service.delete_session(
                    app_name=APP_NAME,
                    user_id=managed_user_id,
                    session_id=session_id,
                )

            asyncio.run(delete_session())
            session_deleted = True
            evidence.append({"operation": "Delete synthetic managed Session after readback", "status": 200, "expected": 200})

            print(json.dumps({
                "synthetic": True,
                "project": PROJECT,
                "ai_request_id": envelope["request_id"],
                "cards": [{"type": card.get("type"), "status": card.get("status")} for card in envelope["cards"]],
                "checks": evidence,
                "synthetic_test_user_and_household_cleaned": True,
                "canonical_food_and_shopping_records_unchanged_by_generation": True,
            }, indent=2))
    finally:
        if user is not None:
            if managed_user_id is None and household_id:
                session_scope = hashlib.sha256(json.dumps([user.uid, household_id], separators=(",", ":")).encode()).hexdigest()
                managed_user_id = f"household:{session_scope}"
            if managed_user_id and not session_deleted:
                async def delete_session_after_failure():
                    await session_service.delete_session(
                        app_name=APP_NAME,
                        user_id=managed_user_id,
                        session_id=session_id,
                    )

                try:
                    asyncio.run(delete_session_after_failure())
                    session_deleted = True
                except Exception as exc:
                    # The request can time out before a Session is created. Keep cleanup reporting
                    # useful without leaking provider response content or synthetic account details.
                    print(json.dumps({"session_cleanup_pending": type(exc).__name__}))

            hashed_uid = hashlib.sha256(user.uid.encode("utf-8")).hexdigest()
            db.recursive_delete(db.collection("users").document(hashed_uid))
            if household_id:
                db.recursive_delete(db.collection("households").document(household_id))
            db.collection("ai_usage").document(hashed_uid).delete()
            auth.delete_user(user.uid, app=app)
        firebase_admin.delete_app(app)


if __name__ == "__main__":
    main()
