# Owner setup guide

Updated 16 October 2026. Start with the synthetic demo; it does not need cloud credentials. The repository does not claim a deployed service or live Gemini integration.

## Run the local demo

From `frontend/`, install the locked dependencies once with `npm ci`, then run `npm run dev -- --port 3002`. The app uses synthetic browser data. Do not confuse it with canonical Firestore state.

## Local FastAPI

From `backend/`, run `uv sync --locked`, then `uv run uvicorn app.main:app --reload --port 8000`. The local API uses Application Default Credentials for Firebase Admin. The current workstation has ADC configured for the hackathon project; never commit service-account keys. Protected endpoints fail closed until Firebase Authentication, a matching identity, explicit active household membership and Firestore records are ready.

Set `FIREBASE_PROJECT_ID=ecoloop-staging-20261015` and `BACKEND_CORS_ORIGINS=["http://localhost:3002","http://127.0.0.1:3002"]` in the local backend environment. The sample `backend/.env.example` uses these local origins. The browser API origin is `http://localhost:8000`.

## Firebase browser configuration

The Firebase Web app is registered in the existing project. Obtain its public Web configuration with `firebase apps:sdkconfig WEB <WEB_APP_ID>` after selecting the correct project; see the [Firebase CLI reference](https://firebase.google.com/docs/cli). Copy its `apiKey`, `authDomain`, `projectId` and `appId` into the matching `NEXT_PUBLIC_FIREBASE_*` variables in `frontend/.env.local`, and set `NEXT_PUBLIC_ECOLOOP_API_ORIGIN=http://localhost:8000`. These values identify the Web app; never place service-account credentials or private keys in browser variables.

Firebase Authentication is not initialized yet. Initialize it in Firebase Console, enable Google sign-in for `/account`, and authorize `localhost`. The judge seed uses a separate known email/password identity, but that UI is not implemented; enable Email/Password in Firebase Console before creating the judge Auth user. Do not assume the signed-in Google account matches the seeded judge UID.

The `--apply --data-only` run has already created and read back five synthetic Firestore documents: a root household, one membership and three food observations with `synthetic: true` and unknown dates. It did not create an Auth user because Authentication is not initialized. After Authentication and Email/Password are enabled, the seed helper can create the isolated judge Auth user. Set `ECOLOOP_JUDGE_PASSWORD` in a local secret manager or process environment (at least 16 characters; never paste it into chat, commit it, or print it to logs), then run from the repository root:

```powershell
uv run --project backend python backend/scripts/seed_judge.py --apply
```

The helper requires Application Default Credentials and targets the single hackathon project. It creates only missing records, does not overwrite the five existing synthetic documents, and reads back expected paths. Inspect its output. Do not enable the judge login flow until the email/password UI is implemented.

## Gemini API key for synthetic development

The Gemini/ADK integration is being implemented separately; the current application has no verified live Gemini call path and no API key is configured, so adding a key today does not enable an assistant response. When that integration is available, keep `GEMINI_API_KEY` server-side in the local process or a secret manager. Never use a `NEXT_PUBLIC_` variable, commit the key or share it in chat.

For a bounded synthetic-data experiment, Google AI Studio offers a free tier for some models, including Flash-Lite models at the time of this guide. The free tier is limited and Google may use submitted content to improve products. Send only synthetic, non-personal data. Review [current Gemini API pricing and tier limits](https://ai.google.dev/gemini-api/docs/pricing) before each experiment; free availability and limits can change. No paid call or cloud deployment is authorized by this guide.

## Current setup blockers

Firestore Standard was created in `asia-south1` and its create response reported `freeTier: true`; billing remains off. Deny-all Firestore rules were successfully deployed, while the required indexes are not deployed. The app's live Firestore connectivity and authenticated user flow are not verified. The data-only synthetic seed is present; its Auth user was not created. Cloud Run and Firebase App Hosting are not configured or deployed. Public access needs the appropriate hosting/service setup and reviewed billing, IAM, secrets, region and cost controls; none is ready yet.

Keep `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS` unset or false. Enable it only after live identity, active membership, Firestore command writes, version conflict recovery, idempotent retry behavior and the owner review are verified. The local demo continues using its isolated synthetic store. See [implementation status](STATUS.md) and the [live MVPTasks Sheet](https://docs.google.com/spreadsheets/d/10PQygT-suDuX2pfbDOpP-Y_q81XkExWBPFP_60_2GiI/edit#gid=1002).

The prepared agent branch defaults to AGENT_MODEL=gemini-3.1-flash-lite and accepts GEMINI_API_KEY (preferred) or GOOGLE_API_KEY. Set AGENT_PROVIDER=gemini_api to avoid accidental Vertex selection. Its code is committed separately and must be integrated before these variables enable requests. No live generation or prompt evaluation has been performed. The older 2.5 family can restrict new-project access; keep the model configurable and verify availability before use.
