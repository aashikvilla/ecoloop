# Consolidated local coding and regression checkpoint — 17 October 2026

## Branch and worktrees

Root integration: `codex/demo-integration` at pushed commit `3f4dbc8`. Integrated photo-intake commit `29477eb` after review. The photo UI accepts bounded JPEG/PNG/WebP and submits authenticated bytes for Gemini candidate extraction; only candidate records persist, not the image. `FoodAction` cards now link into existing owner-reviewed outcome/share forms. Earlier branch-specific implementations are already represented in the root integration tree/history; outdated reference branches were not blindly merged. Git now registers only the root checkout. An unregistered partial folder remains at `C:\Projects\ecoloop-worktrees\foundation`; its `frontend/node_modules` junction points into the active root dependencies. Cleanup was blocked by local deletion review, so the junction target and partial folder were left untouched.

## Checks

- Backend `uv run --locked --project backend python -m compileall -q backend/app`: passed.
- Frontend ESLint: passed.
- Frontend TypeScript (`npx tsc --noEmit`): passed.
- Frontend production build: passed, 15 route outputs including account, settings, intake review, item outcome/share, Ask, Activity and Shop.
- `git diff --check`: passed before final documentation/code adjustment; rerun before commit.
- No unit tests or new Gemini provider calls were performed. One authorized local API/Firestore acceptance run created a disposable synthetic test account/household and verified database-backed commands; no billing changes or deployments occurred.

The first parallel frontend check raced with several old dev servers and found corrupted ignored Next `.next/dev/types/validator.ts`; the app listeners were stopped, only the exact malformed generated lines were removed, and a clean production build/typecheck then passed.

## Implemented local product coding

- Auth gate, Google/email sign-in, solo household onboarding, household discovery/selection and sign-out.
- Canonical authenticated API reads for Home, Kitchen, Ask, Shop, Activity and Settings; no browser mock-store fallback.
- Manual/text/photo candidate capture, candidate review and explicit confirmation. Photo request is size/MIME/signature bounded and image bytes are not retained.
- Firestore-backed pantry/shopping commands, outcomes, owner-private sharing/activity/history and consented owner-private preferences.
- One ADK orchestrator with scoped read-only pantry/shopping tools, validated typed cards, durable private proposal turns, explicit BuyCheck-to-shopping approval, and a PreferenceConsent card that writes only after explicit owner consent.
- Activity summaries measured/estimated/unknown outcomes without a fabricated sustainability score.

## Still open

- Managed Agent Runtime, Sessions and Memory Bank; preference CRUD is local Firestore-backed and does not prove managed Memory Bank.
- Private Storage upload/finalize/retention lifecycle; current photo flow uses transient request bytes and persists candidates only.
- Additional actionable approval workflows for MealSuggestion and PortionAdjustment; these remain advice-only because there is no canonical meal-plan record to revise. FoodAction links to existing review pages but does not auto-confirm.
- Manual browser acceptance across every route and command; browser automation previously refused the localhost tab. One bounded durable Gemini response is recorded historically, but no new AI call was made in this checkpoint and photo extraction has not been exercised against a live provider.
- Billing account/project linkage, linked-project/cost review, budget/controls, required cloud APIs/IAM, Cloud Run/App Hosting deployment, deployed acceptance, and live MVPTasks reconciliation.

Status is local code and verification only. Do not claim the cloud product or phase exits complete. `docs/STATUS.md` remains a dated snapshot; the live task sheet remains authoritative.

## Local service and API acceptance

- The integrated checkout runs one frontend at `http://127.0.0.1:3000` and one authenticated FastAPI API at `http://127.0.0.1:8001`; prior EcoLoop listeners on ports 3001/3002/8002 were stopped. Browser routes for `/`, `/account`, `/kitchen`, `/kitchen/add`, `/kitchen/review`, `/ask`, `/shop`, `/activity`, `/settings`, item detail, outcome, and share all returned HTTP 200. The 3000-to-8001 CORS preflight returned 200 with the expected allow-origin.
- Backend health reports Gemini Developer API configured/enabled, `runtime_check=not_performed`, unmanaged in-process sessions, and managed Sessions/Memory false. This checkpoint made no new Gemini request; the durable assistant route has one earlier bounded successful provider/history-readback observation. Photo extraction still lacks live provider acceptance.
- The existing synthetic API acceptance runner completed against local FastAPI/Firestore: household create/discovery, fact create and exact replay, stale 409, Kitchen read, fact correction/replay and stale 409, Shop create/replay/read/archive/replay/empty read, outcome/replay with exactly one stock decrement, Activity read, and foreign-household 403. It left one labelled synthetic account/household and records in Firestore for continued demo work. The script does not retain a password for that disposable account; use the already-provisioned judge account for browser sign-in.
- This verifies API/Firestore behavior and route serving, not browser interaction. Sign-in, household onboarding, screenshots, image upload, Ask card actions, and visual accessibility still need a human click-through at the single local URL.

## Follow-up regression and worktree cleanup

The first follow-up HTTP check found that all frontend routes were returning 500 because the active `frontend/node_modules` tree lacked locked package `@alloc/quick-lru`; the Next launcher was also unavailable after an interrupted install. Running `npm ci --prefix frontend --no-audit --no-fund` completed from the committed lockfile (442 packages added) without changing `package.json` or `package-lock.json`. The local frontend was restarted on port 3000; `/`, `/account`, `/kitchen`, `/kitchen/add`, `/kitchen/review`, `/ask`, `/shop`, `/activity`, `/settings` and API `/api/v1/health` all returned HTTP 200. Next logged non-fatal instant-navigation validation warnings for several routes; route serving succeeded. Only ports 3000 and 8001 are listening.

An additional assistant-flow slice now lets the owner save a `PreferenceConsent` card through the existing private preferences API. It requires an explicit click, validates and reads the private preference list before enabling consent, rehydrates saved state on page load, uses the server-generated proposal ID as the stable preference ID to prevent duplicate records, and shows conflicts/settings review if that ID already holds different text. Frontend lint, TypeScript and production build passed after the change; the local routes returned HTTP 200 after restart. No unit tests, preference write or Gemini request ran.

Git reports only `C:/Projects/ecoloop` as a registered worktree. A partial unregistered folder remains under `C:/Projects/ecoloop-worktrees/foundation`; it contains a junction to the root frontend `node_modules`. Cleanup was attempted only after verifying the junction target, but local deletion review blocked it, so that junction/folder was preserved. The ignored frontend/backend environment files and tracked user PDF remain present; their contents were not read.
