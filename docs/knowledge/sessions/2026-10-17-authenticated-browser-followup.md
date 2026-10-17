# Authenticated browser follow-up — 17 October 2026

## Scope and checkpoint

This pass continues local authenticated acceptance on `codex/demo-integration`, based on pushed commit `59f2f80`. The owner reported that Google sign-in succeeded but Settings appeared stuck and asked to continue local end-to-end work. The separate “Review implementation document” chat remains idle/not loaded; its separately owned work was not touched. PR #1 is still open and draft against `main`; no phase exit or merge was attempted.

No frontend/backend unit tests, provider request, browser write, account/household creation, cloud configuration, billing action, provisioning or deployment was performed in this pass. The user PDF and unrelated files were preserved. No real environment file was read.

## Browser evidence

The existing signed-in browser session was on the local application at `http://localhost:3000`, with the API on port 8001. It was authenticated as the existing owner account; credentials and tokens were not inspected or copied. The account page loaded two existing memberships from the authenticated household API, and the synthetic “EcoLoop Demo Kitchen” was selected.

Observed screen reads:

- Home rendered four API-backed Kitchen records, no meal plans, and zero recorded activity.
- Kitchen rendered four Firestore-backed records (Onions, Rice, Spinach, and synthetic Tomatoes). Dates were unknown and the UI asked the owner to check them.
- Shop rendered one synthetic Firestore-backed Milk entry.
- Activity showed zero outcomes and zero share offers; it made no unsupported savings or sustainability-score claim.
- Settings loaded the signed-in user's empty private-preference response and showed the preference form plus Managed Memory Bank “not configured.” This confirmed a private read, not managed Memory Bank.
- Ask loaded the authenticated empty conversation and suggestion prompts. Send stayed disabled until the owner enters a prompt. No model call was sent in this follow-up.

These are selective read-only screen observations. They do not establish sign-in/onboarding writes, command acceptance, all-route accessibility, photo extraction, durable AI response, managed services, or whole-journey acceptance. A prior bounded Gemini response and history readback are recorded separately; they are not new evidence from this pass.

### Read-only route and process check

A fresh local browser tab completed the existing Google sign-in and loaded two Firebase-backed household memberships. After selecting the existing “EcoLoop Demo Kitchen” and using the in-app Kitchen link (client-side navigation), Kitchen showed four API-returned records and no mock fallback. A signed-out direct Kitchen load showed the “Sign in to continue” gate with no records. The household selection is in-memory tab state: it survives in-app navigation but clears on a full reload/direct route navigation, after which the owner must select it again.

Only frontend port 3000 (PID 7768) and FastAPI port 8001 (PID 2464) were listening. Ports 3001, 3002, 3003 and 8002 were unavailable. An already-open port-3002 tab still displayed the older scripted-demo DOM, so it was stale content and not a live server; use `http://127.0.0.1:3000` for the integrated app. The signed-in tab was left open on `/account` with the existing household selected.

The health endpoint returned `healthy`, Gemini Developer API configured/enabled, `runtime_check=not_performed`, unmanaged in-memory sessions, and Managed Sessions/Memory false. This endpoint does not probe the provider. The browser check performed sign-in and household selection only; it did not create/update records, send an AI prompt, or call a managed service.

## Local changes

- `frontend/src/components/account/preference-controls.tsx`: React StrictMode replays effect setup/cleanup in development. Cleanup cleared `uidRef`, then the replacement read's success and error handlers both discarded their result, leaving Settings loading. Each effect setup now restores its captured UID, and cleanup clears the ref only if it still belongs to that effect. The existing in-flight request abort behavior remains.
- `frontend/src/app/settings/page.tsx`: replaced static “Sign in to manage personal preferences” copy, which contradicted the signed-in screen, with neutral private-preference guidance.
- `backend/app/api/v1/endpoints/accounts.py`: validates active memberships first, batches parent household-document reads with one bounded `db.get_all`, associates snapshots by reference path, skips missing parents, and makes no empty batch call. Membership validation, result shape/order, limits and error handling remain unchanged.

The local API health response was healthy and reported Gemini configured/enabled, runtime check not performed, unmanaged in-process Sessions, and Managed Sessions/Memory unavailable. Health does not probe Gemini and no model call occurred.

## Verification

- Frontend `npm run lint` passed after the captured-UID cleanup refinement.
- Frontend `npm exec tsc -- --noEmit` passed after the captured-UID cleanup refinement.
- Backend `.venv\\Scripts\\python.exe -m compileall -q app` passed after the missing-snapshot/empty-input guard.
- `git diff --check` passed after the code changes. Documentation line-ending notices from Git are informational; no whitespace errors were reported.
- No unit tests are allowed by project instructions and none ran. No production build was requested for this narrow follow-up.

## Remaining gates

- Exercise signed-in form actions (intake/correction, shopping, outcomes, sharing, preference consent/revocation, proposal approval) with bounded synthetic data and verify persisted readback/retries/conflicts. Keep the browser write flag disabled outside an explicitly scoped acceptance pass.
- Exercise the durable Ask proposal flow once through authenticated FastAPI when the paid-call policy is approved; then verify private history and only explicitly approved canonical actions. This pass made no AI request.
- Managed ADK Runtime, Sessions and Memory Bank remain unavailable/unverified; local ADK/in-process sessions are not proof of those services. Photo object upload/finalize/retention/cleanup is not complete.
- Review billing linkage, every linked project, credits, actual eligible spend caps and IAM; the selected ₹2,000 project-wide budget is alerts-only and not a hard total-spend ceiling.
- Cloud APIs/identities, build/image, Cloud Run or App Hosting deployment, HTTPS health/identity checks, live MVPTasks reconciliation and phase exit reviews remain open. Local/browser evidence does not close them. PR #1 remains draft; do not merge `main` from this pass.
