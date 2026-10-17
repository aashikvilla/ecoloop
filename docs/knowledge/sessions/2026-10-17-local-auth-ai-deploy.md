# Local authentication, durable AI and deployment review — 17 October 2026

## Scope and ownership

The owner asked to update local env configuration, provision judge access, verify Firebase/database and Gemini end to end, and continue toward deployment. Root remains integration owner on `codex/demo-integration` at `70e511f`. Two GPT-6 Luna/high workers independently reviewed the assistant route and Cloud Run prerequisites. Both were read-only; neither changed files, read env files, called Gemini, mutated cloud or ran tests.

The user's task-specific authorization allowed root to read/update ignored local env files and provision the synthetic judge login. The project-wide safeguard in `AGENTS.md` remains unchanged for future tasks. No key/password was committed or included in this journal.

## Local configuration and acceptance

- The Firebase web SDK config was already present in ignored `frontend/.env.local`; the backend's ignored `backend/.env` already contained the Gemini Developer API key and model configuration. The configured key successfully served one request. No key was printed or recorded. `AGENT_VERTEX_PROJECT_ID` remains unset because this backend uses Gemini Developer API, not Vertex AI; the provided `gen-lang-client-0971462038` is the AI Studio API-key project, while Firebase/Firestore remain in `ecoloop-staging-20261015`.
- Firebase cannot return an existing plaintext password. At the owner's request, root reused the already-seeded `judge-demo@ecoloop.example` identity and assigned a new random password, storing email/password only in ignored `backend/.env`. This avoided creating a second identity with no matching household membership.
- Firebase Identity Toolkit accepted that login. The authenticated local API returned two active household memberships. Selecting `judge-demo-household` returned ten synthetic kitchen records from Firestore.
- The backend process on port 8001 remained untouched and reports the assistant disabled. A separate foreground local API on port 8002 was started with `AGENT_ENABLED=true`, the EcoLoop project, and CORS limited to the local preview. One durable `/api/v1/assistant/proposals/turns` request used only confirmed Tomatoes and Spinach. Gemini returned HTTP 200 and one schema-validated `MealSuggestion`; authenticated private-history readback found the stored turn. No card approval, shopping change or stock mutation followed. Health reports `session_store=in_memory_unmanaged`, `managed_sessions=false`, and `managed_memory=false`.
- A managed detached preview worktree at the same pushed commit `70e511f` was created because the existing Next dev server owns the root checkout's single-instance lock and inherited API origin. Its local ignored `.env.local` contains public Firebase settings, local-only command/onboarding flags and API origin `http://127.0.0.1:8002`. `npm ci` completed. Next dev started on port 3001; 12 app routes returned HTTP 200 and Next diagnostics returned no config/session errors. Browser automation timed out opening the local page, so no visual browser sign-in or click-through is claimed. The current UI preview is `http://127.0.0.1:3001/account` (sign in with the synthetic credentials, select `judge-demo-household`) and then `/ask`.
- `deploy/local.ps1` now accepts `-BackendPort` (default 8001), pairs the frontend API origin with it, and builds the CORS allowlist from the chosen frontend port plus the prior 3000/3003 origins. The launcher parsed successfully and its generated CORS JSON was checked. To reproduce the preview after manually stopping the relevant existing processes: backend `./deploy/local.ps1 -Service backend -BackendPort 8002 -FrontendPort 3001 -EnableAi`; frontend `./deploy/local.ps1 -Service frontend -BackendPort 8002 -FrontendPort 3001`. AI remains opt-in; default startup is disabled.
- The root checkout's port-3000 process continues using its original process environment and API port 8001. Changing its ignored `.env.local` did not replace inherited values. The isolated 3001/8002 preview is the working configuration until the user chooses to restart the original services. Do not kill the existing service automatically.
- `npm ci` reported 9 high, 0 critical dependency advisories in the preview install (`firebase`, `eslint-config-next` and transitive packages). No dependencies were changed; classify/remediate before deployment. No frontend/backend unit tests were run.

## Cloud Run gate findings

Read-only CLI review found project `ecoloop-staging-20261015` ACTIVE, with Firestore/Firebase APIs enabled but Cloud Run, Cloud Build, Artifact Registry, Secret Manager and Cloud Billing APIs absent. No dedicated runtime service account or image digest is available. EcoLoop is not linked to billing. Billing/account linkage, credits, budget, and cost controls are unverified; the only previously identified closed billing account is linked to `My First Project`, and reopening it can resume that project's charges. The account owner must inspect linked projects/usage and arrange a safe billing account before any activation or paid deployment. No cloud state was changed.

Official prerequisite reference: [Cloud Run functions quickstart](https://docs.cloud.google.com/run/docs/quickstarts/functions/deploy-functions-gcloud) requires billing enabled and enabling Artifact Registry, Cloud Build, Cloud Run and Cloud Logging APIs. Project links and account-level associations can be reviewed in [Billing account management](https://docs.cloud.google.com/billing/docs/how-to/view-linked).

## Remaining work

1. Owner reviews the closed billing account's linked projects, recent usage, credits and budget; do not reopen/link until a safe account arrangement and cost controls are confirmed.
2. User manually opens the local preview. The computer-use tool timed out on localhost and no workaround was attempted. Sign in, select the synthetic household, inspect Kitchen and Ask, and report any UI errors.
3. Review/remediate the 9 high frontend dependency advisories in a separate checkpoint; run allowed lint/type/build verification only, no unit tests.
4. Finish manual authenticated UI acceptance across Home, Kitchen, Ask, Shop, Activity, Settings, intake, item correction, share/history and sign-out. Photo upload/extraction and private media lifecycle remain unimplemented.
5. Managed ADK Runtime/Sessions/Memory and broader proposal/tool/privacy/cost controls remain incomplete; local one-turn proof is not managed-service proof.
6. After billing and owner IAM approval: enable required APIs, create a same-project least-privilege runtime identity and repository, build/push an immutable image from `backend/` only, deploy a private Cloud Run candidate with the reviewed HTTPS frontend origin, and verify authenticated/foreign-household behavior before any promotion.
7. Reconcile live MVPTasks and phase exit evidence. PR #1 remains draft; no `main` merge or phase completion is supported yet.

## Verification and surprises

`/api/v1/health` and authenticated Identity Toolkit + FastAPI/Firestore readbacks were verified. The one bounded AI request and private history readback passed. The Next preview served 12 routes successfully with no reported server errors. PowerShell parse and generated CORS JSON checks passed for the launcher adjustment; `git diff --check` passed. Browser UI interaction was not verified; `mcp__cua_repl` timed out opening localhost. Deployment was not attempted. No unit tests, reset credits, billing changes, cloud API changes, IAM changes, Hosting changes, or deployments were performed.

Lesson: a running Next process keeps inherited `NEXT_PUBLIC_*` values, and Next prevents a second dev instance from sharing the same checkout. Inspect the compiled client/process; use an isolated checkout/port for a parallel local configuration rather than assuming an edited env file changes a live process.
