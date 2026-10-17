# Canonical data and local setup — 17 October 2026

## Request and scope

Owner asked to remove mock data from the app, connect destinations to backend/Firestore data, prepare the local environment, and clarify `AGENT_VERTEX_PROJECT_ID`, managed agents and Cloud Run. Work stayed local and on `codex/demo-integration`. No billing, provider calls, cloud provisioning, index deployment or Cloud Run deployment was performed.

## Implemented and pushed

- `codex/backend-local-live` added absolute-path loading of ignored `backend/.env`, `AGENT_ENABLED=false` by default, safe provider status on health, and explicit in-memory/unmanaged session status. Checkpoint `53f1af2` was integrated into `codex/demo-integration` (`6d9023e`). The configured local Gemini credential no longer enables a call by itself.
- `codex/live-backend-ui` moved Home, Kitchen, Ask, Shop and Activity to canonical API reads; the selected Firebase identity/household scope is shared per tab. Ask validates and renders typed API cards. DemoStore, its validator, synthetic contracts and all `useDemo` consumers were removed. Capture/review/item/share operations and managed preferences now show unavailable states where canonical endpoints/UI are missing. Writes remain disabled.
- The root branch includes both worktree checkpoints and documentation updates. The intended remote review remains draft PR #1; `main` was not changed.
- Ignored local config now sets frontend API origin `http://localhost:8000` and write flag false. Backend CORS already includes the frontend's `3002` origins. Real local env files and keys were never committed or printed during this pass.

## Verification

- Frontend `npm ci` restored the primary ignored dependency tree after a worktree junction caused `EPERM`. Production build succeeded and generated 14/14 pages. `npx tsc --noEmit` and ESLint passed. No unit tests were run or added.
- Backend `python -m compileall -q app`, `uv lock --check`, and `git diff --check` passed. A read-only local Admin SDK request reached Firestore and confirmed the seeded `judge-demo-household` document exists and has `synthetic: true`. Local health reported the Gemini Developer API selected but disabled, runtime unchecked, managed Sessions false and managed Memory Bank false. Unauthenticated `/api/v1/kitchen` returned 401; authenticated API reads remain unverified.
- HTTP smoke check returned 200 for Home, Kitchen, Ask, Shop, Activity, Settings, Account, capture/review and item routes. Browser inspection of Ask showed the updated household-data UI and signed-out state; no live Auth/Firestore request was possible.
- `npm audit` reports 9 high-severity advisories (4 with production dependencies). The compatible fix did not apply; `--force` proposes breaking Firebase/Next dependency downgrades and was not used.

## Verified cloud facts and blockers

- Firebase project `ecoloop-staging-20261015` has a Firestore Native database in `asia-south1` and five synthetic seed documents. Client Firestore rules deny direct access. Required share/activity indexes are declared but undeployed.
- Firebase Authentication is not initialized (`CONFIGURATION_NOT_FOUND`); the synthetic Auth user was not created. The browser sign-in code supports Email/Password and Google, but provider setup in Firebase Console is required before live sign-in and API reads can be proven.
- `AGENT_VERTEX_PROJECT_ID` means a Google Cloud project ID for Vertex AI. The current ID is `ecoloop-staging-20261015`; it is not an agent identifier and should remain blank when using the Gemini Developer API.
- The repo has local ADK `LlmAgent` code with in-memory sessions only. No managed Vertex Agent Runtime/Agent Engine resource, managed Sessions, Memory Bank or Cloud Run service is deployed. Cloud Run, Cloud Build and Artifact Registry APIs are disabled, and billing is not linked. The billing account must be reviewed against every linked project before reopening or paid deployment.

## Remaining work and lesson

Owner action: initialize Firebase Authentication, enable providers, authorize `localhost`, and create/verify the synthetic user matching UID `ecoloop-judge-demo` and household `judge-demo-household`. Then prove authenticated reads, membership denial, and indexed history. The UI still lacks canonical capture/intake, item detail, outcome/share writes, proposal storage/approval, managed preference controls, and managed Sessions/Memory Bank. Cloud deployment remains a separate billing/IAM/secrets/cost-control gate.

Lesson: when a request asks to remove demo data, remove the shared demo provider and data model rather than only replacing the primary page components. Keep explicit unavailable states where canonical services or reviewed commands do not exist.

Architecture pointer: [current architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md), [setup](../../SETUP.md), and [status snapshot](../../STATUS.md). The live MVPTasks Sheet remains the only status authority.
