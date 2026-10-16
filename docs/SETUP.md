# Owner setup guide

Updated 17 October 2026. The household destinations now read only from the authenticated API; synthetic browser records were removed. The repository does not claim a deployed service or a live Gemini response.

## Run the local app

From `frontend/`, install the locked dependencies with `npm ci`, then run `npm run dev -- --port 3002`. `frontend/.env.local` should set the existing Firebase Web configuration and `NEXT_PUBLIC_ECOLOOP_API_ORIGIN=http://localhost:8000`. The browser destinations never substitute local demo records for API data.

## Local FastAPI

From `backend/`, run `uv sync --locked`, then `uv run uvicorn app.main:app --reload --port 8000`. Settings load process environment variables first, then the ignored `backend/.env` file. Firebase Admin uses Application Default Credentials; never commit service-account keys. Protected endpoints fail closed until Firebase Authentication, a matching identity, explicit active household membership and Firestore records are ready.

The local backend config targets project `ecoloop-staging-20261015`; CORS must include `http://localhost:3002` and `http://127.0.0.1:3002`. The sample file uses these local origins. The browser API origin is `http://localhost:8000`.

## Firebase browser configuration

The Firebase Web app is registered in the existing project. Obtain its public Web configuration with `firebase apps:sdkconfig WEB <WEB_APP_ID>` after selecting the correct project; see the [Firebase CLI reference](https://firebase.google.com/docs/cli). Copy its `apiKey`, `authDomain`, `projectId` and `appId` into the matching `NEXT_PUBLIC_FIREBASE_*` variables in `frontend/.env.local`, and set `NEXT_PUBLIC_ECOLOOP_API_ORIGIN=http://localhost:8000`. These values identify the Web app; never place service-account credentials or private keys in browser variables.

Firebase Authentication is initialized in the Console. Email/Password and Google providers are enabled; `localhost` and `127.0.0.1` are authorized for local development, along with the project's default Firebase domains. The Google OAuth display name is EcoLoop and its support email is the owner-approved account. The `/account` UI supports both providers. Synthetic judge user `ecoloop-judge-demo` has signed in and matched the seeded membership for `judge-demo-household`; a separate synthetic household was also created through the authenticated onboarding API. Local acceptance evidence is in [onboarding/live acceptance](evidence/onboarding-live-acceptance-2026-10-17/README.md).

The `--apply --data-only` run has already created and read back five synthetic Firestore documents: a root household, one membership and three food observations with `synthetic: true` and unknown dates. It did not create an Auth user. After choosing a local judge password, the seed helper can create the isolated judge Auth user. Set `ECOLOOP_JUDGE_PASSWORD` in a local secret manager or process environment (at least 16 characters; never paste it into chat, commit it, or print it to logs), then run from the repository root:

```powershell
uv run --project backend python backend/scripts/seed_judge.py --apply
```

The helper requires Application Default Credentials and targets the single hackathon project. It creates only missing records, does not overwrite the five existing synthetic documents, and reads back expected paths. Inspect its output. The `/account` route already has an email/password sign-in form. This seed operation creates a Firebase Auth user and is separate from enabling the providers.

## Gemini API key for synthetic development

The backend contains local ADK `LlmAgent` code and a Gemini Developer API key is configured in the ignored backend environment. The code uses temporary in-process sessions; it is not a deployed Vertex AI Agent Engine/runtime resource and has no managed Sessions or Memory Bank. `AGENT_ENABLED` defaults to `false`, so key presence does not make a model call. Keep the key server-side; never use a `NEXT_PUBLIC_` variable, commit it, or share it in chat.

`AGENT_VERTEX_PROJECT_ID` is the Google Cloud **project ID** used when selecting Vertex AI, not an agent ID. Find it in the project selector in Google Cloud Console or with `gcloud config get-value project`. The current project ID is `ecoloop-staging-20261015`; leave the setting blank when using the Gemini Developer API. Vertex AI use requires its API, IAM/ADC and billing setup; none was enabled in this pass. See the [Vertex AI quickstart](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/quickstart).

Review [current Gemini API pricing and tier limits](https://ai.google.dev/gemini-api/docs/pricing) before enabling a model call. No model calls, paid provisioning, or cloud deployment were performed in this pass.

## Current setup blockers

Firestore Standard exists in `asia-south1`; deny-all Firestore client rules are deployed and the five synthetic seed documents are present. Required share/activity indexes are declared but not deployed. Authenticated browser/API reads and bounded synthetic command writes have been verified; see [implementation status](STATUS.md) for the exact scope. Cloud Run, Firebase App Hosting and managed agents are not deployed. Cloud Run, Cloud Build and Artifact Registry APIs were observed disabled in the latest cloud audit. Current billing linkage, linked-project impact and budget alerts could not be verified. Review the billing account and all projects associated with it, then choose cost controls before any paid provisioning or deployment.

Keep `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS` unset or false. Enable it only after live identity, active membership, Firestore command writes, version conflict recovery, idempotent retry behavior and the owner review are verified. The browser app has no synthetic-store fallback; the five existing Firestore seed documents are explicitly marked synthetic. See [implementation status](STATUS.md) and the [live MVPTasks Sheet](https://docs.google.com/spreadsheets/d/10PQygT-suDuX2pfbDOpP-Y_q81XkExWBPFP_60_2GiI/edit#gid=1002).

The local health endpoint reports provider selection and opt-in state without calling the model. One signed-in local Ask request returned a validated Gemini MealSuggestion card; this does not prove a managed agent deployment, persistent session/memory, broad model quality or deployed operation. See [AI evidence](evidence/ai-schema-fix-2026-10-17/README.md) and use a bounded, owner-reviewed scope before further model calls.
