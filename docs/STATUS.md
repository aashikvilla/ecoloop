# EcoLoop implementation status

Updated 17 October 2026. This repository file is a snapshot, not the live MVPTasks Sheet; the Sheet remains the task-status authority.

## Local application

- Home, Kitchen, Ask, Shop and Activity read only from authenticated household API routes. No browser DemoStore or mock-record fallback remains. Loading, signed-out, empty, error and unavailable states are explicit.
- Capture/review, item details, outcome writes, private-share writes, assistant approval and managed preferences are not connected to canonical flows. Their routes show unavailable states instead of writing local sample data. Account supports manual fact confirmation, shopping commands and private-history reads; writes remain disabled by `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS=false`.
- Firebase browser sign-in code supports Email/Password and Google, and selected household scope is shared across destinations in the current tab. Firebase Authentication is not initialized, so live sign-in is not possible yet.
- The API enforces Firebase identity plus active household membership and exposes Firestore-backed reads/commands. Local settings load the ignored `backend/.env`; the assistant requires `AGENT_ENABLED=true`. Current health reports the Gemini Developer API as selected/configured but disabled, without probing it or making a model call.

## Cloud state

- Project `ecoloop-staging-20261015` (“EcoLoop Hackathon”); Firestore Native Standard database exists in `asia-south1`. Five synthetic seed records were created/read back. Client Firestore rules deny all direct client access; server Admin SDK access still requires verified identity and explicit membership.
- Email/Password and Google Authentication providers are enabled. `localhost` and `127.0.0.1` are authorized for local sign-in, along with the project's default Firebase domains. The matching judge Auth user (UID `ecoloop-judge-demo`) has not been created, so authenticated API reads are still unverified. Required share/activity indexes are declared in code but not deployed.
- The backend contains ADK `LlmAgent` code with temporary in-memory sessions. No managed Agent Engine/Vertex runtime, managed Sessions, Memory Bank, or Cloud Run service is deployed. Cloud Run, Cloud Build and Artifact Registry APIs are disabled. Billing is not linked.

## Verification performed

- Frontend production build generated 14/14 pages successfully; TypeScript and ESLint passed. No frontend/backend unit tests were added or run.
- Backend Python compile and locked dependency checks passed. A read-only local Admin SDK smoke read reached Firestore and confirmed the seeded household document exists and is marked synthetic. Local `/api/v1/health` reported assistant disabled, runtime unchecked, managed Sessions false and managed Memory Bank false. An unauthenticated `/api/v1/kitchen` request returned 401; authenticated API reads remain unverified.
- No authenticated Firestore API read, model call, cloud provisioning, index deployment, or Cloud Run deployment was performed. Full end-to-end acceptance remains open.

## Required next steps

1. Create or verify the synthetic judge user with UID `ecoloop-judge-demo`, matching household `judge-demo-household`, then sign in and verify authenticated API reads and membership denial. Do not assume an ordinary Google account UID matches the seeded membership.
2. Sign in through the app and verify authenticated Kitchen/Shopping reads, membership denial for a wrong household, and share/activity history after deploying the required indexes.
3. Implement and review canonical capture/intake, item detail, outcome/share UI, proposal persistence/approval, and managed preference correction/deletion. Keep the write flag off until live identity, transaction and idempotency acceptance passes.
4. `AGENT_VERTEX_PROJECT_ID` is the Cloud project ID for Vertex AI requests, not an agent resource ID. The current project ID is `ecoloop-staging-20261015`; leave it unset for Gemini Developer API. Assistant calls remain disabled until provider, privacy, consent and cost review is complete.
5. Before deployment, review the billing account and every linked project, project IAM, secrets, region, budget alerts and cost controls. Enable required APIs and prepare Cloud Run/App Hosting only after that review and authorization.

The current integration is on `codex/demo-integration` and PR #1 remains a draft. It has not been merged to `main`; cloud and end-to-end phase gates remain open.

For local setup, see [SETUP.md](SETUP.md). For architecture boundaries, see [knowledge/ARCHITECTURE.md](knowledge/ARCHITECTURE.md) and the [current specification](planning/CURRENT_MVP_SPEC.md).
