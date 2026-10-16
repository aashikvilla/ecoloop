# EcoLoop implementation status

Updated 17 October 2026. This repository file is a snapshot, not the live MVPTasks Sheet; the Sheet remains the task-status authority.

## Local application

- Home, Kitchen, Ask, Shop and Activity read only from authenticated household API routes. No browser DemoStore or mock-record fallback remains. Loading, signed-out, empty, error and unavailable states are explicit.
- Capture/review, item details, assistant approval and managed preferences are not connected to canonical flows; those routes show explicit unavailable states. Account now includes manual fact confirmation, shopping commands, owner-reported outcome and private-sharing controls, and paginated private-history reads. All mutation controls share the false-by-default `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS` release flag; keep it false pending live identity/database acceptance and owner approval.
- Firebase browser sign-in supports Email/Password and Google. A synthetic Email/Password account (`judge-demo@ecoloop.example`, UID `ecoloop-judge-demo`) matches the seeded membership and has been used for authenticated reads. The account UI now offers a minimal “Just me” household onboarding flow and sign-out. A second synthetic household was created through the authenticated API and read back successfully; sign-out returned to signed-out UI state.
- The API enforces Firebase identity plus active household membership and exposes Firestore-backed reads/commands. Local settings load the ignored `backend/.env`; no environment file was read during this pass. The one local assistant-enabled attempt failed before a provider request and the backend was stopped; see the linked acceptance evidence.

## Cloud state

- Project `ecoloop-staging-20261015` (“EcoLoop Hackathon”); Firestore Native Standard database exists in `asia-south1`. Five synthetic seed records were created/read back. Client Firestore rules deny all direct client access; server Admin SDK access still requires verified identity and explicit membership.
- Email/Password and Google Authentication providers are enabled. `localhost` and `127.0.0.1` are authorized for local sign-in, along with the project's default Firebase domains. Synthetic judge UID `ecoloop-judge-demo` has authenticated successfully and matched the seeded `judge-demo-household` membership; a separate household was created through the authenticated route. Required share/activity indexes are declared in code but not deployed.
- The backend contains ADK `LlmAgent` code with temporary in-memory sessions. No managed Agent Engine/Vertex runtime, managed Sessions, Memory Bank, or Cloud Run service is deployed. Cloud Run, Cloud Build and Artifact Registry APIs are disabled. Billing is not linked. One synthetic Ask attempt failed locally while converting the numeric `Literal` in the ADK output schema (`ValueError: Literal values must be strings`) before any provider request; the UI then showed a timeout. No AI result is claimed. The assistant-enabled local backend was stopped after this attempt.

## Verification performed

- Frontend production build generated 14/14 pages successfully; TypeScript and ESLint passed. No frontend/backend unit tests were added or run.
- Backend Python compile and locked dependency checks passed. Authenticated browser/API acceptance read Kitchen for `judge-demo-household`, read an empty Shopping list, and received 403 for a non-member household. The onboarding API returned 201 for `EcoLoop Test Kitchen` (`d8e5ef4cb23b4925a383ae1ae29792c5`); its authenticated Kitchen read returned an empty list. Sign-out returned the browser to signed-out state. Evidence is recorded in [onboarding/live acceptance](evidence/onboarding-live-acceptance-2026-10-17/README.md).
- No successful model response, managed agent/session/memory proof, index deployment, cloud provisioning, or Cloud Run deployment was performed. Full end-to-end acceptance remains open.

## Required next steps

1. Fix and review the ADK schema conversion in the separately owned `codex/real-household-agent` branch, then make one bounded synthetic Ask request and record the actual provider outcome. The failed conversion happened before the provider request; do not claim AI success from it.
2. Deploy the declared share/activity indexes and verify private history reads. This is still a cloud write and requires separate authorization.
3. Implement and review canonical capture/intake, item detail, proposal persistence/approval, and managed preference correction/deletion. Keep the write flag off until live identity, transaction and idempotency acceptance passes.
4. `AGENT_VERTEX_PROJECT_ID` is the Cloud project ID for Vertex AI requests, not an agent resource ID. The current project ID is `ecoloop-staging-20261015`; leave it unset for Gemini Developer API. Managed agent calls remain unavailable until the output-schema defect and provider/privacy/consent/cost review are resolved.
5. Before deployment, review the billing account and every linked project, project IAM, secrets, region, budget alerts and cost controls. Enable required APIs and prepare Cloud Run/App Hosting only after that review and authorization.

The current integration is on `codex/demo-integration` and PR #1 remains a draft. It has not been merged to `main`; cloud and end-to-end phase gates remain open.

For local setup, see [SETUP.md](SETUP.md). For architecture boundaries, see [knowledge/ARCHITECTURE.md](knowledge/ARCHITECTURE.md) and the [current specification](planning/CURRENT_MVP_SPEC.md).
