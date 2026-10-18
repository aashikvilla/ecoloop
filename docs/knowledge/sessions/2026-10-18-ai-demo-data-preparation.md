# AI demo data preparation and local acceptance — 18 October 2026

## Scope

Prepared six realistic synthetic consumer Kitchens and twelve NGO-only Bengaluru planning scenarios so the AI demo can start from populated state. Verified the local Gemini flows and organization UI. No commit, deployment, physical-food offer, reservation, receipt, impact record, or stock mutation was made.

## Prepared data and configuration

- Six consumer accounts and one NGO account are documented with demo credentials in the root README. The idempotent seeder is `backend/scripts/seed_ai_demo.py`; the data inventory, exact NGO search request, and limitations are in `docs/AI_DEMO_DATASET.md`.
- Read-only Firestore audit found six Kitchens with 45 confirmed Kitchen records total. The consumer demo and Vasanth kitchens are the featured recipe/use-soon examples. Twelve scenario records cover six Bengaluru areas within 4.53 km of the saved NGO base.
- Each NGO scenario has `demo_scenario=true`, unknown condition and storage, and no real expiry/availability assertion. Only the seeded NGO account can see them. UI labels them rehearsal-only; saved plans can be reviewed, but both server and UI block reservation. They cannot create receipt, impact, or recovered-food records.
- Local `backend/.env` now enables Gemini with `AGENT_PROVIDER=gemini_api`, configures `AGENT_SESSION_STORE=vertex_ai` against the existing Agent Engine resource in `asia-south1`, disables Memory Bank, and keeps the AI request cap bounded. No credentials or secret values are recorded here.
- The authenticated Asha meal turn caused health to report `session_store=vertex_ai_verified`, `managed_sessions=true`. This verifies Vertex-backed ADK Sessions for the local turn. It does not establish a managed Agent Runtime deployment. Memory Bank remains off.
- `GOOGLE_MAPS_ROUTES_API_KEY` is missing. The saved collection-plan route endpoint has a Google Routes integration but returns unavailable without the server key; the new AI alternative cards still use approximate stop ordering/distance. A browser Maps key is not substituted. No Routes request or deployment was attempted. Owner billing/account-wide cost review remains an external prerequisite.

## Acceptance evidence

- Firebase authentication succeeded for all six documented consumer accounts and the NGO account. The seed command reported six synthetic Kitchens and twelve non-claimable rehearsal offers in `ecoloop-staging-20261015`.
- Local Gemini provider ping succeeded. Asha's authenticated `/api/v1/assistant/turns` call returned HTTP 200 and a `MealSuggestion` grounded in confirmed spinach, potatoes, and onion; missing cooking ingredients were identified. A session ID was returned; Kitchen was not mutated.
- The organization page displayed all twelve entries with district/locality labels. Submitting the documented 1,500 g vegetarian-spinach request returned two options: 3 stops / 9.6 km approximate and 4 stops / 11.7 km approximate, each covering 1,500 g. Stop labels and route disclaimer were visible. These are computed from seeded quantities and straight-line distances; no driving-route timing/order is claimed.
- An earlier local photo-to-pantry check and the Kitchen-prefilled surplus form are recorded in [the prior AI demo acceptance journal](2026-10-18-ai-demo-fix-acceptance.md). Publishing a household offer still requires real donor food and honest condition/storage confirmation; this rehearsal dataset is not eligible for operational pickup.
- `python -m compileall -q app scripts/seed_ai_demo.py`, `git diff --check`, frontend lint, TypeScript, and production build passed. No unit tests were run, per project contract.

## Findings and boundaries

- The first organization Gemini call failed because the Google GenAI schema converter rejected an unsupported `additionalProperties` field in the generated JSON Schema. The adapter now strips unsupported provider-hint fields and retains strict local Pydantic validation; the subsequent authenticated request succeeded.
- Managed Sessions are verified for the local Vertex session adapter. A managed Agent Runtime deployment, approved Memory Bank facts, Google Routes, production pickup, and fresh D5 reserve/receipt acceptance remain unverified.
- The demo can truthfully show purchase advice, a grounded recipe, offer-prefill review, and two NGO recovery-plan alternatives. It cannot present rehearsal records as real public food or present approximate straight-line estimates as driving routes.

## Pointers

[Dataset and search prompt](../../AI_DEMO_DATASET.md), [demo accounts and current readiness](../../../README.md#demo-accounts), [implementation status](../../STATUS.md), [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md), [past mistakes](../PAST_MISTAKES.md).
