# Returning-member onboarding and local read acceptance — 17 October 2026

## Scope

Continue local household onboarding and read-only browser acceptance on `codex/demo-integration`. The existing local user signed into the already open port-3000 app. No credentials or tokens were inspected. The signed-in account had two Firebase-backed memberships; the existing `EcoLoop Demo Kitchen` household was selected. We did not create a new household because memberships and usable demo records already existed.

## Small onboarding correction

The first-household wizard appeared for returning members while they had existing memberships but had not yet selected one. Updated `frontend/src/components/account/account-connection.tsx` so:

- users with no memberships see first-household setup after membership discovery completes;
- users with memberships see the chooser first and can open setup explicitly with “Create another household”;
- selecting an existing membership closes the optional creation panel.

This avoids nudging returning users into creating duplicate households while keeping the explicit creation path available. No backend contract or permission behavior changed.

## Observed local acceptance

- Firebase sign-in succeeded in the current browser tab. Membership discovery returned two households.
- Selecting the existing household and using normal in-app navigation loaded four Kitchen records and one Shopping entry through the authenticated household API.
- Home rendered the same household’s four records, no saved meal plans, and zero outcomes. It did not invent a score or savings figure.
- Ask rendered its signed-in, household-scoped empty state. No prompt was sent and no new Gemini request was made.
- Activity rendered zero outcomes and zero share offers. Settings rendered an empty private-preference list and “Managed Memory Bank is not configured.”
- Capture showed manual intake and photo selection/camera affordance. We did not choose or upload a file.
- Account showed the two membership choices. The optional “Create another household” control opened the first step, and selecting the existing membership closed it. No household, Kitchen, Shopping, preference, outcome, share, or AI data was written in this pass.
- `GET /api/v1/health` returned HTTP 200. It reports Gemini configured/enabled, but `runtime_check=not_performed`; in-memory unmanaged sessions; Managed Sessions false; and Memory Bank not configured. Health is configuration status, not evidence of an AI response.
- CORS `OPTIONS /api/v1/households` from port 3000 returned HTTP 200 with the matching allow-origin.

## Visual and code verification

- A compact live capture screenshot was compared with `docs/prototypes/ecoloop_add_food_smart_capture/screen.png`. The warm palette and four-tab navigation are consistent. The live implementation separates photo selection from manual entry and has no full-screen camera preview. This was a single screenshot review, not a pixel comparison, 360px viewport acceptance, or full-route accessibility review. The orange Next.js dev issue badge was present in the screenshot.
- Frontend `npm run lint`: passed.
- Frontend `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- No unit tests, production build, browser mutation, photo upload, or model/provider request ran.
- At start of the pass, Codex usage was 22% in the 5-hour window and 78% in the weekly window; no reset credit was consumed. The integration checkout was clean at `fa58789`, with PR #1 open/draft and no reported checks. Only the root worktree was registered.

## Still open

- The full browser write journey and authenticated command acceptance have not been repeated in this pass. Existing live evidence is in [onboarding acceptance](../../evidence/onboarding-live-acceptance-2026-10-17/README.md) and [consolidation regression](2026-10-17-consolidation-and-local-regression.md).
- No Gemini call was made in this pass. A prior successful model/card response is documented separately; do not infer current provider availability from health.
- Managed ADK Runtime, managed Sessions, Memory Bank, private photo storage/retention, push delivery, and Cloud Run/App Hosting deployment remain open. A sustainability score is still intentionally absent until its evidence and method are approved. Real merchant/recipient integrations remain out of scope.
- No M0–M5 exit or `main` merge is claimed. PR #1 remains draft and the live MVPTasks Sheet remains the status authority.
