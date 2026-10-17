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

## Follow-up — Home date review and capture entrypoints

Two static frontend audits found the capture route was orphaned from Home and Kitchen, and Home lacked distinct recorded-date versus no-date prompts. Home now displays up to four records of each kind from the authenticated canonical Kitchen response. A recorded date keeps its explicit date type and date-only value; a no-date record is labeled with its last observation date. Both link to canonical item review. Copy asks the owner to review/check the record and does not infer food safety, freshness, or photo-derived expiry. Home’s empty state and Kitchen now link to `/kitchen/add`. Implementation plan M2.02.02 records this local slice but remains unchecked pending prerequisites and acceptance evidence. `docs/planning/IMPLEMENTATION_PLAN.md` remains the phase task authority; no live task sheet was changed.

Frontend ESLint, TypeScript and `git diff --check` passed. The running frontend returned HTTP 200 for `/`, `/kitchen` and `/kitchen/add`; this is route-serving evidence only, not an authenticated browser interaction. No browser click-through, unit tests, API writes, AI call, cloud operation, credential/environment file read, or deployment was performed for this slice.

## Follow-up — saved plan read and media expiry cleanup

Two additional unfinished local coding slices were implemented in the shared integration checkout without touching the separately owned assistant agent/config files. `GET /api/v1/meal-plans` now reads allowlisted versioned plan records from the active household with membership recheck and bounded cursor pagination; the strict browser client and Home section show saved plans, uncertainty/quantity provenance, and links to only the pantry item IDs that were validated in the assistant request. Copy distinguishes a saved plan from preparation/eating and unchanged stock. The explicit outcome remains per item rather than linked to a plan, so M4.02.02 stays open.

The new bounded `python -m scripts.cleanup_private_media --limit N` command processes expired server-owned media metadata, marks rows `DELETE_PENDING` transactionally, deletes only matching object paths, and finishes `DELETED`; missing objects are treated as successful idempotent retries. Malformed paths are skipped, transient failures remain pending, and the command returns nonzero if skipped/pending rows remain. A state/expiry index supports filtering completed rows; `--cursor` continues a multi-page sweep, and failed/skipped rows hold the cursor before the first blocked record for retry. It has not been run against a configured bucket. The required index is only local; no bucket, IAM, lifecycle schedule, or cleanup deployment was checked; M1.01.03 stays open. Root review additionally tightened household/owner path IDs and only treats the same object path as already deleted.

Meal-plan read agent reported backend compile and whitespace checks passed; retention agent reported backend compile and safe `--help` usage output passed, without runtime Firestore/GCS changes or unit tests. Root critical review tightened expiry cleanup path validation, retries and multi-page continuation. Final combined checks passed: frontend ESLint, TypeScript, backend `compileall`, Firestore index JSON parsing and `git diff --check`. Local routes `/`, `/kitchen`, `/kitchen/add` returned HTTP 200; the new unauthenticated meal-plan route returned HTTP 401. These checks do not prove authenticated plan reads, live cleanup, Home browser rendering, linked item outcome journeys, or deployed service acceptance.

The local health endpoint currently reports Gemini Developer API configured/enabled, but `runtime_check=not_performed`, unmanaged in-memory sessions, and managed Sessions/Memory false. No provider request was made in this pass. Browser inspection on the single current frontend (`http://127.0.0.1:3000`) confirmed signed-out Ask and Kitchen routes show the sign-in gate with no records. Port audit found only frontend 3000 and API 8001 listening; 3001/3002/3003/8002 are closed. Existing browser tabs can still show their already-loaded stale DOM from the old 3002 prototype; use/refresh port 3000 and close stale tabs as convenient.

Git reports only `C:/Projects/ecoloop` as a registered worktree. A partial unregistered folder remains under `C:/Projects/ecoloop-worktrees/foundation`; it contains a junction to the root frontend `node_modules`. Cleanup was attempted only after verifying the junction target, but local deletion review blocked it, so that junction/folder was preserved. The ignored frontend/backend environment files and tracked user PDF remain present; their contents were not read.

## Follow-up coding slice — meal-plan approvals and private media API

The owner asked to consolidate coding onto one branch, remove local worktrees, finish remaining implementation slices, and then run a whole-app regression. The integration branch was `codex/demo-integration`; Git registered only the root checkout. The previously reviewed partial non-Git folder at `C:\Projects\ecoloop-worktrees\foundation` remains preserved because its dependency junction points to the active checkout and deletion was blocked. The separate “Review implementation document” chat remains idle/owner of its branches; no files were taken from it.

- [x] Added authenticated, idempotent transactional meal proposal APPROVE/EDIT/DISMISS. MealSuggestion creates a canonical plan; PortionAdjustment requires a scoped current plan reference and version. Eligible recognized-unit, certain ingredient quantities are saved as assistant estimates and scale deterministically only when preparation has not begun. Model-proposed amount changes are not written; stock is untouched. Ask now exposes serving/stage controls and sends only explicit supported actions through the allowlisted API transport.
- [x] Added authenticated private-media upload/read/delete API routes with owner/household checks, generated object paths, content bounds/signature checks, retry binding and fail-closed configuration. The router is registered. The existing image intake still forwards bounded bytes transiently to Gemini and stores candidate fields only; the browser does not use this media API.
- [ ] Private media is not operationally complete: no bucket has been verified/configured, no lifecycle cleanup removes expired bytes, and no browser workflow calls these routes. Expiry metadata alone does not delete objects. Current photo candidate extraction remains independent and transient.
- [ ] Managed ADK Runtime, Sessions and Memory Bank remain absent. The app has one ADK household orchestrator; coding subagents are not runtime agents. Cloud Run/App Hosting, billing/cost review, deployed acceptance and live task-sheet reconciliation remain open. Sustainability reporting remains factual activity only; a composite eco score and savings claims are expressly excluded by the current spec.
- [ ] Browser click-through and authenticated meal-plan action acceptance remain pending. User-facing copy was corrected to describe server-side estimate scaling, saved plan version checks and unchanged stock.

No unit tests, provider calls, env-file reads, browser writes, cloud changes, billing actions or deployment were made for this slice. Independent critical review found and fixed the PortionAdjustment plan-target/title mismatch; model-proposed amount deltas are explicitly labeled preview-only. Backend `compileall`, frontend ESLint, frontend TypeScript, `git diff --check`, and local HTTP smoke checks passed. The nine checked frontend routes returned HTTP 200; unauthenticated requests to both new backend routes returned HTTP 401, confirming route registration and auth gating without writes. A production build was not rerun in this follow-up because Next.js automatically loads ignored `.env.local`, which this run's project instructions prohibit reading. No browser sign-in/click-through or authenticated meal action was performed. Do not mark M3.02.02 or phase exits complete from coding alone.
