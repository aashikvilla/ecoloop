# EcoLoop end-to-end readiness audit — 17 October 2026

## Scope and evidence limits

Root audited the current `codex/demo-integration` checkout at `4451bcd`; three GPT-6 Luna/high workers reviewed frontend route wiring, backend/assistant boundaries, and release gates in read-only mode. The checkout was clean. This audit did not change application code, query real environment files, run tests/builds, operate the browser, submit database writes, call Gemini, change cloud configuration, enable billing, or deploy. Separate `codex/docs-cleanup` and `codex/real-household-agent` worktrees were not modified.

## Current app coverage

| Area | Implemented | Observed acceptance | Remaining |
|---|---|---|---|
| Authentication/onboarding | Firebase Email/Password and Google sign-in; “Just me” household creation; sign-out | Synthetic Email/Password login, scoped Kitchen/empty Shop reads, foreign-household 403, household create/readback and sign-out | Google sign-in journey not separately evidenced; no deployed acceptance |
| Home/Kitchen/Shop/Activity | Authenticated API readers and explicit loading/empty/error/signed-out states | Kitchen and empty Shop reads; wrong-household denial | Home and Activity not separately exercised; private Activity requires undeployed composite indexes |
| Manual/text intake | Candidate-only create, read, edit, select and explicit confirmation | Synthetic create/edit/partial/full confirmation, then Kitchen readback | Replay after successful-but-lost response; stale/concurrent conflict and contention |
| Item detail/correction | Canonical detail read; default-off versioned correction UI | Code, lint/type and independent review only | No Firestore mutation, zero-value, conflict or retry acceptance |
| Ask/AI | One local ADK `LlmAgent`/Runner, Gemini path, Firestore context, strict card validation; five typed card renderers | One synthetic signed-in request produced a validated MealSuggestion; approval disabled and no data changed | Current API reports assistant disabled; temporary in-memory sessions only; no managed Runtime/Sessions/Memory, executable tools, persisted proposals or approvals; no quality/latency/cost evaluation |
| Account actions | Fact, Shopping, outcome, owner-reported sharing and paginated history controls | Household setup and reads; write flag remains false by default | No full live acceptance for these write families; private indexed history unverified |
| Settings and photo | No preference API, photo upload or extraction pipeline | Storage rules deny all client reads/writes | Preference consent/correction/revocation/deletion, private media lifecycle, retention and human-reviewed photo candidate flow |
| Release | Guarded Cloud Run helper and container packaging in repo | No deployed image/service/app | IAM, billing/cost proof, image build, Cloud Run/App Hosting configuration, HTTPS health, deployed security/whole-flow acceptance |

Not every route is connected to live data: Settings is static and `/kitchen/items/[id]/share` is an explicit unavailable route; owner-private sharing controls live under Account. Core destination code uses authenticated API data, but only selected routes and command paths have live synthetic evidence.

## Read-only project CLI observations

Target project/config was `ecoloop-staging-20261015`. `gcloud firestore databases describe` returned Firestore Native `(default)` in `asia-south1`. Enabled services listed `firestore.googleapis.com`, `identitytoolkit.googleapis.com`, and `storage.googleapis.com` (plus `bigquerystorage.googleapis.com`). Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Vertex AI and Firebase App Hosting were not listed as enabled.

`gcloud run services list --platform managed` failed with `SERVICE_DISABLED` for `run.googleapis.com`; no service inventory was available. `firebase apphosting:backends:list` reported that the project must be on Blaze before `firebaseapphosting.googleapis.com` can be enabled. `firebase hosting:sites:list` returned the registered site `ecoloop-staging-20261015.web.app`; a registered site does not prove a release is deployed. `gcloud storage buckets list` returned no bucket rows to the active identity; Storage rules remain deny-all.

`gcloud billing projects describe` could not establish billing state: Cloud Billing API is disabled in quota project `681255809395`, and the active identity lacks permission to read target billing details. Billing linkage, linked-project impact, available credits, budget alerts and cost controls are therefore **unverified**. No attempt was made to enable the API or change billing.

The local API health endpoint at port 8001 returned `healthy`, provider `gemini_developer_api`, configured `true`, enabled `false`, runtime check `not_performed`, session store `in_memory_unmanaged`, managed Sessions `false`, and managed Memory `false`. Health does not make a provider call. One earlier local Gemini response is separately evidenced and does not imply the current process will answer Ask.

The live MVPTasks Sheet was last modified 16 October 2026 23:57 UTC; all Done fields remained false, and its details predate later 17 October root evidence. Its statuses should be reconciled by the owner before using it to report completed units. No phase exit review is evidenced; PR #1 is still draft and `main` is not release-ready.

## Prioritized next work and owner decisions

1. **Owner cost/access decision:** confirm the single project and `asia-south1`; inspect the billing account, all linked projects and available credits; choose whether to upgrade to Blaze/enable billing; define a monthly budget alert and additional controls. The prior knowledge warns that reopening a closed billing account could affect another active project; today’s CLI could not verify that relationship. Do not paste API keys or service credentials into chat or Git.
2. **After owner authorization:** enable only the required APIs; create separate least-privilege Cloud Run runtime and deploy identities; decide Cloud Run invoker/origin policy; put server secrets in Secret Manager. Build the backend from `backend/` on a usable Docker/approved build host, deploy a no-traffic candidate, verify health and authenticated correct/foreign household requests, then configure App Hosting separately. No deployment or API enablement happened in this audit.
3. **Finish M2/M4 acceptance:** replay an intake after successful write with lost response, verify stale/concurrent conflicts and duplicate prevention, live-test item correction and Account action families using synthetic data, deploy/verify share/activity indexes, then review activity/private history. Keep the command flag default-off outside a scoped acceptance session.
4. **Complete product gaps:** add the private media upload/finalize/retention/deletion design and owner-reviewed Storage setup before photo extraction; add managed Sessions/consented Memory controls, executable scoped tools, and persistent proposal approval before claiming the full Ask→approve→outcome loop.
5. **Before merge:** reconcile the live MVPTasks sheet and stale setup/foundation notes through their owner-owned docs worktree; gather M0–M5 prerequisite evidence and dated exit reviews. PR #1 must not be merged from local evidence alone.

Current authority pointers: [implementation plan](../../planning/IMPLEMENTATION_PLAN.md), [current status](../../STATUS.md), [parallel plan](../../planning/PARALLEL_EXECUTION.md), [Cloud Run readiness](../../implementation/cloud-run-readiness.md), [onboarding acceptance](../../evidence/onboarding-live-acceptance-2026-10-17/README.md), [intake acceptance](../../evidence/intake-confirmation-2026-10-17/README.md), and [AI evidence](../../evidence/ai-schema-fix-2026-10-17/README.md).
