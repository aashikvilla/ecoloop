# Local end-to-end implementation — 17 October 2026

## Scope and checkpoint

The owner asked for a functional local household journey backed by Firebase and real AI, no browser mock/local persistence, and deployment deferred. Root integration is `codex/demo-integration` at `5948ab5` (pushed). Private preference API is integrated from `codex/local-onboarding` at `83aa28e`. Cloud Run and web deployment were not attempted.

## Done and verified

- Deployed the declared private share/activity composite indexes to Firestore in `ecoloop-staging-20261015`; both reached READY and a signed-in Activity read returned 200.
- Seeded the labelled `judge-demo-household` with seven additional real Firestore pantry documents (ten pantry items total). Seed is create-only and readback verified; existing records were not overwritten.
- Added a local acceptance runner that creates an isolated synthetic Firebase test user/household and uses the real signed-in API. One run verified household creation, fact create and exact replay, stale-version 409, Kitchen readback, shopping create/replay/read, outcome create/replay, stock reduction exactly once, Activity read and foreign-household 403. The later household-discovery run was blocked while its new collection-group field index was still CREATING; rerun after it becomes READY.
- Enabled `AGENT_ENABLED=true` only in the current local backend process. Health reports configured/enabled and correctly continues to report `runtime_check=not_performed`, `session_store=in_memory_unmanaged`, and managed Sessions/Memory false.
- Added sign-in/household gates before private destinations, Firebase Auth in-memory persistence, and an authenticated `/api/v1/households` discovery endpoint plus account picker. The membership query requires a Firestore collection-group single-field index for `members.uid`; its deployment succeeded but index was still CREATING at last observation.
- Added private consented preference APIs, owner hash scope, bounded records, transaction versions, idempotency, correction and text-clearing revocation. Managed Memory Bank is explicitly `not_connected`.
- Added the bounded local-run PowerShell helper, expanded create-only synthetic seed, and pure schema boundary tests.
- Python schema/preference tests: 8 passed. Python compileall passed. Frontend lint and TypeScript passed. Production Next build passed with all 14 routes generated. `git diff --check` passed.

## In progress / exact next steps

1. Wait until Firestore `members.uid` collection-group single-field index reaches READY; rerun `backend/scripts/local_demo_acceptance.py --apply`, confirm GET `/households` and account picker readback. The earlier failure is an index-build delay, not accepted proof of the endpoint.
2. Review and sequentially integrate `codex/local-actions` for Shop add/update/archive and contextual item actions; test its version and retry boundaries.
3. Review and integrate `codex/local-ai-actions` for server-persisted typed assistant proposals, owner-private history and explicit approval. Root must add its endpoint allowlist and inject only opted-in active Firestore preferences into trusted AI context. Run one bounded real Gemini interaction and verify approved shopping action separately from consumption.
4. Review and integrate account preference controls, currently in progress on `codex/local-onboarding-ui`.
5. After all branch integrations, run frontend lint/type/build and backend targeted tests/compile; exercise one signed-in browser journey if the browser security policy allows it. Current browser tooling rejected the localhost tab and forbids workarounds; the owner said they can manually reload the tab.
6. Fix issues found, reconcile `docs/STATUS.md` and live MVPTasks evidence, and update the session journal. Do not close M0–M5 or merge `main` from local-only evidence.

## Current local services

- Next dev server: `http://127.0.0.1:3003` (port process 38768 at journal time).
- FastAPI reload server: `http://127.0.0.1:8001` (port process 36460; AGENT_ENABLED was set in the process environment).
- Start from two terminals with `deploy/local.ps1 -Service backend -EnableAi` and `deploy/local.ps1 -Service frontend` after Firebase/gcloud CLI login. Public Firebase Web configuration is retrieved from Firebase CLI, never committed.
- The frontend signs out of Firebase Auth on a full page reload because persistence is in memory; household selection is also memory-only.

## Observations / lessons

- Deploying existing composite indexes succeeded, but Activity remained unavailable until the indexes were READY. Record the index's state before interpreting the first query error.
- Firestore requires explicit collection-group index scope for the membership lookup. The `firebase.json` single-field override deployed successfully; the index was not ready at the last check.
- A separate local process started by `npm run dev -- --hostname 127.0.0.1 --port 3003` lost positional handling in this PowerShell invocation. Use `npm.cmd run dev -- --hostname=127.0.0.1 --port=3003`.
- The local browser tool blocked this localhost target; do not switch to raw browser/debug interfaces to bypass the decision. Ask the owner to operate/reload the visible tab when UI interaction is required.

## Decisions and current authority

This is local implementation evidence only. The planning authority remains [current MVP spec](../../planning/CURRENT_MVP_SPEC.md), [implementation plan](../../planning/IMPLEMENTATION_PLAN.md), [parallel execution plan](../../planning/PARALLEL_EXECUTION.md), architecture and decisions. Deployment remains deferred; no billing, Cloud Run, Firebase Hosting or App Hosting changes were made. No real env files were read or credentials committed. See [previous readiness audit](2026-10-17-e2e-readiness-audit.md) for historical cloud configuration observations.

## Integration follow-up — 17 October

The work described above has since advanced; the earlier in-progress list and `5948ab5` snapshot are historical. On `codex/demo-integration`, root committed `2d34eba` (proposal transport/router and approved-preference AI context), cherry-picked the isolated Settings UI at `48cfde7`, and integrated contextual item/Shop actions at `443eaf4`. `codex/local-onboarding-ui` source commit was `15ca34d`; `codex/local-actions` source was `8d6e05e`; the AI proposal source commits were `5364b78` and `eaa647c`. No `main` merge was made.

Fresh local verification: backend unittest discovery ran 15 tests, all passed; `compileall`, targeted frontend ESLint, `npx tsc --noEmit`, and `git diff --check` passed. Local OpenAPI inspection confirmed proposal turn/history/action, preferences, and shopping archive routes. The database-only acceptance script used Firebase CLI web config in process memory and created a random synthetic Firebase test account/household (no password saved or printed). Against the real local API/Firestore it observed household POST/GET 201/200, fact POST/replay 200/200 and stale 409, Kitchen 200, Shop add/replay 200/200 then archive/replay/read 200/200/200, outcome/replay 200/200 with tomato stock reduced exactly once, Activity 200, and foreign-household Kitchen 403. Synthetic data remains in Firestore for that run.

An independent critical review of the integrated auth/scope/idempotency changes found no actionable issue. A repository search of `frontend/src` found no `localStorage`, `sessionStorage`, `DemoProvider`, `useDemo`, or mock-data references. Settings copy was corrected after integration so it no longer claims available manual/reviewed controls are disabled.

Follow-up correction acceptance extended the runner to update one confirmed observation (version 1 → 2), repeat the identical command, submit a distinct stale version, and verify the corrected name/amount in Kitchen. The first run stopped on a harness assertion that compared request-specific envelope IDs; the API had returned successfully. The assertion now compares the stable `result`, and the next full local Firebase Auth/Firestore acceptance passed, including correction replay and stale conflict. No browser write or new AI/provider call was made in this pass.

The current local backend health reports `healthy`, provider `gemini_developer_api`, configured/enabled `true`, but `runtime_check=not_performed`, unmanaged in-memory sessions, and managed Sessions/Memory false. It exposes the newly wired durable assistant routes. No additional provider request was issued in this follow-up because billing/paid calls remain deferred; the earlier legacy `/assistant/turns` 200 response is not durable-path acceptance. A browser sign-in journey is also still awaiting manual operation because the local browser automation was refused by its security policy. Deployment and `main` merge remain out of scope until the phase evidence and exit reviews are satisfied.
