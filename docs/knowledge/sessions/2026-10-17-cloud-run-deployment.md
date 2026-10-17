# Cloud Run deployment — 17 October 2026

## Scope

The owner asked to deploy the EcoLoop app on Cloud Run, applying the local frontend/backend configuration. Work stayed on `codex/demo-integration`; no branch or main merge was performed. The user explicitly requested household setup and demo commands to be functional, so the Cloud Build release opted in to those UI flags. The project uses one environment: `ecoloop-staging-20261015` in `asia-south1`.

## Boot and release review

- Read `AGENTS.md`, the current parallel execution plan, architecture, decisions, past mistakes, latest household browser acceptance session, cloud readiness notes, current Git branch/worktrees, PR #1, current chats/artifacts and active agents.
- Started with usage at 26% (five-hour), 79% (weekly); one reset credit was available and none was consumed. Ordinary usage was allowed.
- PR #1 remains draft/open. Only the root worktree is registered. Current checkout is `codex/demo-integration`; push remains synchronized.
- The all-services ₹2,000 budget is a billing-account alert, not a guaranteed cap. The target project is linked to an open billing account and was the only linked project returned. The existing Gemini API service control was observed separately.
- The API key's project, `gen-lang-client-0971462038`, is active but billing is disabled. Do not infer that the EcoLoop project budget or Gemini service control applies to that separate key project.

## Code checkpoint and verification

Pushed `c9c6d6b` (`feat: prepare bounded Cloud Run release`) with Next standalone/Docker/Cloud Build packaging, backend Cloud Build config and a transactional Firestore per-UID daily AI request counter (`AI_DAILY_REQUEST_LIMIT=12`). The deploy helper now supports provider/model/quota settings, exact CORS origin and Secret Manager references; assistant remains off unless an explicit flag is supplied. Pushed `afd7635` (`fix: handle first Cloud Run rollout and image architecture`) after the first Cloud Run attempt exposed that `--no-traffic` is rejected when creating a service and the first frontend image build revealed an ARM-specific Node manifest.

- Frontend ESLint, TypeScript, and optimized production build passed before deployment. Backend `compileall` and settings import passed. Deploy helper PowerShell parsing and `git diff --check` passed. No frontend/backend unit tests were run.
- Backend Cloud Build `b26a03e4-56d3-4554-aa04-7d2cc8c95a6b` succeeded from a committed, selected-path archive. Backend image: `asia-south1-docker.pkg.dev/ecoloop-staging-20261015/ecoloop/backend@sha256:f823786afbd5946e63d777fd20e8eb5187e45a04ee8d97b10457b38bacf4b0d7`.
- First frontend Cloud Build `763a844a-c6be-4556-89da-30966cd4d781` failed because the Node digest resolved to `linux/arm/v7` while Cloud Build targets `linux/amd64`. The Dockerfile now pins the verified official amd64 child digest. Frontend Cloud Build `91fa5fb0-af76-442f-b627-8f2ffe172afe` succeeded. Frontend image: `asia-south1-docker.pkg.dev/ecoloop-staging-20261015/ecoloop/frontend@sha256:7674827cff01c18b09bec4ec44e7c82db626a2348fa3a09effc4ef45f77e96fb`.
- The first helper deploy attempt failed because Cloud Run does not accept `--no-traffic` when creating a service. The helper now detects a first deployment: its assistant-disabled revision serves default traffic; subsequent revisions can be tested with a tagged no-traffic candidate. The helper change was pushed before the successful second deployment.

## Cloud resources and active revisions

- Enabled APIs: Cloud Run, Cloud Build, Artifact Registry, Secret Manager and API Keys. Firebase, Firestore and Identity Toolkit were already enabled.
- Created Artifact Registry Docker repository `ecoloop` in `asia-south1`.
- Created `ecoloop-builder`, `ecoloop-api-runtime`, and `ecoloop-web-runtime` service identities. Builder roles are Cloud Build Builder, Logging Writer and repository-scoped Artifact Registry Writer; Cloud Build service agent can act as builder. API runtime has `roles/datastore.user`; web runtime has no project role. No broad Editor/Owner role was granted to either runtime identity.
- Cloud Run API revision `ecoloop-api-00001-qaf` was initially created with an assistant-off image and an interim CORS origin. API revision `ecoloop-api-00002-sup` was built from the same digest with the actual frontend HTTPS origin, deployed with no traffic, and promoted after smoke checks. Current API URL is `https://ecoloop-api-4wlelpcnca-el.a.run.app`; revision `ecoloop-api-00002-sup` serves 100% traffic. Resource limits: one CPU, 512 MiB, `min=0`, `max=1`, concurrency 20, 60-second timeout.
- Cloud Run frontend revision `ecoloop-web-00001-red` serves 100% traffic at `https://ecoloop-web-4wlelpcnca-el.a.run.app`, with one CPU, 512 MiB, `min=0`, `max=1`, concurrency 20, 60-second timeout. Web and API services have public Cloud Run invokers for browser access; household endpoints still enforce Firebase identity and explicit active membership.
- Firebase Auth's authorized domain list was patched by appending `ecoloop-web-4wlelpcnca-el.a.run.app`; existing domains were preserved (five after update). Google provider was verified enabled. The Firebase web SDK config was retrieved via Firebase CLI for the matching registered web app, validated to match project/app IDs and supplied to the build. Local `.env.local` values were not printed.
- The default Firebase browser API key has Firebase API-target restrictions (including Identity Toolkit) and no browser-referrer restriction. API Keys API was enabled solely to inspect that metadata; no API key restriction was changed.

## Smoke checks and honest limitations

- Frontend GET returned HTTP 200.
- API `/api/v1/health` returned healthy and reported `assistant.enabled=false`, `session_store=in_memory_unmanaged`, `managed_sessions=false`, and `memory_bank=not_configured`.
- API household list without a Firebase token returned HTTP 401.
- Candidate API CORS preflight from the exact deployed frontend origin returned HTTP 200 with matching `Access-Control-Allow-Origin`; that revision was promoted.
- The in-app browser opened the deployed account page and its signed-out route gate. One Google sign-in attempt returned the generic app message “Firebase sign-in could not be completed.” Firebase's provider was enabled and the web host is authorized, but no signed-in API request was observed; Firebase/Firestore access is not accepted in Cloud Run yet. The browser tab remains open at `/account` for the owner to retry or provide the visible error.
- No Cloud Run Gemini request was made. The Gemini key's project has billing disabled, no `gemini-api-key` Secret Manager secret/version was created, and the runtime has no Secret Manager accessor binding. A shell command to move the ignored local key into Secret Manager was rejected by the command policy; it did not emit or store the value, and no alternate transfer path was attempted. The assistant must stay off until the owner chooses a billing-enabled Gemini API key/project and its applicable cost controls are verified.
- Managed ADK Agent Runtime, managed Sessions, Memory Bank, private photo storage, push scheduling, merchant/recipient connections and sustainability-score methodology remain separate incomplete product gates. A healthy Cloud Run service is not their completion evidence.
- No browser database write, model request, unit test, `main` merge or PR merge occurred. PR #1 is still draft/open.

## Follow-up

1. Owner retries Google sign-in on the open deployed `/account` tab; if it still fails, capture the exact provider/browser error. Then verify membership discovery and a Firestore read before declaring the cloud identity/data path complete.
2. Owner selects a Gemini key whose project has the intended billing/limits (prefer the existing EcoLoop billed project) and enters it through an approved Secret Manager flow. Then enable Gemini intentionally and run one bounded authenticated AI request, checking the typed response and stored owner-private turn.
3. Update/re-push this branch with final status, complete authenticated household setup/write/readback acceptance, and keep phase exit and `main` merge gated on their original criteria.
