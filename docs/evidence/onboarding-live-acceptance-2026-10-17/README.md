# Household onboarding and live API acceptance — 17 October 2026

Reviewer: root integrator. Synthetic test data only. Browser: local frontend at `http://127.0.0.1:3003`; local FastAPI at `http://127.0.0.1:8001`; Firebase project `ecoloop-staging-20261015`. The named project is the real hackathon Firebase project; records below are synthetic. This evidence is not deployed-service acceptance, managed-agent proof, or a phase exit review.

## Observed flow

- Signed in as `judge-demo@ecoloop.example` (synthetic UID `ecoloop-judge-demo`) using Email/Password.
- Authenticated Kitchen GET for the seeded `judge-demo-household` returned Tomatoes (6 pieces), Spinach (200 g), and Rice (1 kg).
- Authenticated Shopping GET for that household returned an empty list.
- Authenticated Kitchen GET for `not-a-member-household-000` returned HTTP 403; the browser displayed the household access-denied state.
- Account onboarding submitted “EcoLoop Test Kitchen”; authenticated `POST /api/v1/households` returned HTTP 201 with OWNER role and ID `d8e5ef4cb23b4925a383ae1ae29792c5`.
- Authenticated Kitchen GET for the created household returned an empty list.
- Sign-out returned to signed-out state and cleared the signed-in household records from the page.

These observations establish local browser-to-API identity and membership behavior against the live Firestore project for the observed paths. They do not prove deployed API behavior, private history/index behavior, mutation flag approval, quota abuse resistance, or transaction conflict handling under concurrency.

## AI attempt and boundary

One synthetic prompt asked for a meal suggestion based only on the seeded tomatoes and spinach, explicitly preserving unknown quantities and making no safety inference. The Ask UI showed “Loading took too long. Check your connection and try again.” Backend logs showed an `OPTIONS /api/v1/assistant/turns` preflight success followed by local exception while google-genai transformed the ADK output schema: `ValueError: Literal values must be strings.` The output schema contains numeric `Literal` values. The failure occurred before any Gemini provider request; no AI response or provider success is claimed. The assistant-enabled local backend was stopped after the attempt.

The affected ADK module `backend/app/agents/household.py` is owned by the separate `codex/real-household-agent` workstream. Root did not modify it. The branch owner must make and review the schema correction before another bounded synthetic request.

## Limitations and cleanup

- No password, token, private environment value or service credential is stored in this repository. Share the synthetic test password only through the current private chat; rotate/delete the test account when the hackathon demo is complete.
- No frontend/backend unit tests were run or added. No billing, deployment, index deployment or other cloud write was performed in this acceptance pass.
- Browser command writes remain disabled by default. Managed Sessions, Memory Bank and deployed agent behavior remain unverified.
- Local UI remains open at `http://127.0.0.1:3003`; the local API process was stopped after the failed Ask attempt.

## Phase and merge status

This is partial evidence toward M1 identity/database acceptance, not a completed M1 exit. M0 technical-feasibility review, deployed share/activity indexes, private-history proof, conflict/retry acceptance, complete M2 intake/canonical confirmation, M3 managed agent/memory and approval, M4 outcomes/share/Shop closure, and M5 billing/deployment/whole-journey/release review remain outstanding. PR #1 stays draft; do not merge `main` until applicable acceptance evidence, verified prerequisites, reviewer/date and phase exit review are complete.
