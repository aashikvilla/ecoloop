# Cloud Run readiness — 17 October 2026

## Scope and disposition

This record started as deployment preparation; its 17 October 2026 follow-up now records the first Cloud Run release and remaining gates. The initial environment is `ecoloop-staging-20261015` in `asia-south1`. API, web, build, and image resources were created in this existing billed project after checking its billing link, region, configured budgets, and linked-project list. The Gemini key in the local backend environment belongs to a different project whose billing is disabled; do not enable provider calls or copy that key into this release until the owner selects and verifies the intended billing project/key.

The target is the single project `ecoloop-staging-20261015` (`EcoLoop Hackathon`) in `asia-south1`, matching the existing Firestore database. The deployment uses the digest-pinned backend image, dedicated runtime identity, and exact HTTPS frontend origin. The script defaults to `ecoloop-staging-20261015`, `asia-south1`, and `ecoloop-api`.

The existing [backend Dockerfile](../../backend/Dockerfile) is suitable as a starting point: Python 3.12 slim base image is pinned by digest, `uv` and dependency lock are used, the runtime drops root, and Cloud Run's injected `PORT` is honored. The build context must be `backend/`; its [.dockerignore](../../backend/.dockerignore) excludes `.env` and other environment files (while allowing `.env.example`). The Dockerfile copies only the lock/project metadata and `app/`. Do not use the repository root as build context or upload the backend source tree to Cloud Build: a real ignored `backend/.env` exists locally, and `.dockerignore` is not the source-upload policy for Cloud Build.

## Cloud Run release update — 17 October 2026

- Cloud Run API revision `ecoloop-api-00002-sup` is serving 100% traffic at `https://ecoloop-api-4wlelpcnca-el.a.run.app`. It uses image digest `sha256:f823786afbd5946e63d777fd20e8eb5187e45a04ee8d97b10457b38bacf4b0d7`, one CPU, 512 MiB, `min=0`, `max=1`, and the dedicated `ecoloop-api-runtime` identity. Public invocation is required by browser requests; API routes enforce Firebase identity and membership. The health route returned 200 and a missing-token household request returned 401.
- The Next.js frontend revision `ecoloop-web-00001-red` is serving 100% traffic at `https://ecoloop-web-4wlelpcnca-el.a.run.app`. It uses the project-matched Firebase Web app configuration and explicitly enables the household setup/command build flags for this owner-requested demo. Both services are public at the Cloud Run layer; this does not bypass Firebase authentication or API membership checks.
- The Firebase Auth authorized-domain list was updated by appending `ecoloop-web-4wlelpcnca-el.a.run.app` while preserving the prior entries. Google sign-in is enabled in Firebase. The browser's first Google-popup attempt still returned the app's generic sign-in failure, so signed-in Cloud Run/Firestore acceptance is not established. API health, CORS preflight and unauthorized 401 were verified.
- The API runtime has Firestore data access. The `gemini-api-key` Secret Manager value was not created or attached. The local Gemini Developer API key belongs to `gen-lang-client-0971462038`, whose project billing is currently disabled. `AGENT_ENABLED=false`; no remote model request ran. Managed Sessions and Memory Bank remain disabled/unconfigured. The app is deployed but not yet a signed-in, AI-connected end-to-end release.
- The first frontend image build failed because its pinned Node digest resolved to `linux/arm/v7`; it was corrected to the official `linux/amd64` digest and the rebuilt image succeeded. The first API deployment initially failed because Cloud Run rejects `--no-traffic` when creating a service; the helper now gives the first revision default traffic and uses no-traffic candidates only for later revisions. The first service was assistant-disabled and auth-gated.

## Historical read-only audit evidence (before deployment)

Commands were run from the current integration checkout using the active `gcloud` account. No state-changing command was run.

| Area | Observed state | Evidence and limit |
|---|---|---|
| Target project | `ACTIVE`; project number `26177403871` | `gcloud projects describe ecoloop-staging-20261015` |
| Cloud Run API | Disabled | `gcloud run services list --project ecoloop-staging-20261015 --platform managed` returned `SERVICE_DISABLED`; CLI displayed an enable prompt, which was declined. No service inventory could be read. |
| Cloud Build / Artifact Registry / Secret Manager APIs | Not enabled | Absent from `gcloud services list --enabled --project ecoloop-staging-20261015`. |
| Runtime service accounts | No dedicated backend identity exists in the listed set | `gcloud iam service-accounts list` returned only `firebase-adminsdk-fbsvc@ecoloop-staging-20261015.iam.gserviceaccount.com`; do not reuse it for Cloud Run. |
| Project IAM | Firebase managed bindings plus the human project owner | `gcloud projects get-iam-policy ... --format=json`; no Cloud Run runtime binding was present. |
| Billing | Not verified live in this pass | Current docs/STATUS.md records “billing is not linked.” The first billing query failed because Cloud Billing API was disabled in the active CLI quota project `681255809395` (not the target). A second read-only query specifying `--project=ecoloop-staging-20261015 --billing-project=ecoloop-staging-20261015 --quiet` also failed because Cloud Billing API is disabled in the target project. The `gcloud beta billing` command was unavailable without installing the beta component. Neither component installation nor API enablement was attempted. Treat linked account, account status, linked projects, and credits as unverified now. |
| Budgets / cost controls | Not verified; no evidence of the required alert | The task register requires a `$10/month` alert before paid services; alerts do not cap spend. `Cloud Billing` account/budget listing was unavailable, so current budget state is unknown. |
| Image build | Blocked locally | Docker CLI `28.3.3` is installed, but `docker info` failed because the `desktop-linux` daemon pipe `//./pipe/dockerDesktopLinuxEngine` does not exist. No build was attempted. |
| Existing backend secret configuration | Do not enable | Safe `.env.example` and backend settings show `AGENT_ENABLED=false` by default and a Gemini API secret can be supplied through Secret Manager. Never read or copy `backend/.env`. |

`docs/STATUS.md` is a dated project snapshot, not a substitute for live verification. The 17 October release update above records the state-changing deployment after billing/project linkage, budget, region, IAM, and service configuration were reviewed. The earlier read-only audit below is historical and was superseded for this release.

## Access and cost prerequisites

The deployment uses dedicated `ecoloop-api-runtime` and `ecoloop-web-runtime` identities. The API identity has the narrow Firestore data role (`roles/datastore.user`); the web identity has no project role. Neither runtime identity has Owner, Editor, or Firebase Admin SDK roles. If a reviewed assistant integration later needs `GEMINI_API_KEY`, grant `roles/secretmanager.secretAccessor` on that one secret to the API identity only and bind an exact version in Cloud Run. Secret Manager is not required while assistant calls remain disabled.

The deploy identity is separate from the runtime identities. The builder's Cloud Build, Logging Writer, and repository-scoped Artifact Registry Writer permissions were configured for this release; the Cloud Build service agent can act as the builder. Keep subsequent deploy permissions scoped to Cloud Run, Artifact Registry image access, and `iam.serviceAccounts.actAs` on only the selected runtime identity.

Operational gate status for this release:

- **Passed for this deployment:** the target project's billing link, linked-project list, configured budget alerts/controls, required APIs, `asia-south1` resources, dedicated identities, exact frontend origin, public-invoker route boundary, and bounded Cloud Run sizing were reviewed and configured. See the release update and deployment journal above.
- **Observed spend limitation:** the ₹2,000 all-services budget is an alert, not a hard cap. The per-UID daily AI counter limits authenticated call frequency but does not cap aggregate project spend; `max=1` only bounds Cloud Run instances. Do not describe these as a guaranteed spend ceiling.
- **Still gated:** keep `AGENT_ENABLED=false`. A Gemini key must belong to the intended billing-enabled project and be added as an exact Secret Manager version with accessor permission limited to the API identity. Before turning it on, verify consent/privacy and the applicable project-level cost controls; managed Sessions/Memory requirements and the ADK numeric-`Literal` schema issue also remain open. Attaching a key alone does not authorize model calls.
- **Release shape:** keep one project/environment, `min=0`, `max=1`, concurrency 20, one CPU, 512 MiB, and 60 seconds. These bounds reduce idle compute/scale-out but do not cap spend.

## Prepared release and rollback flow

The PowerShell helper at [deploy/cloud-run.ps1](../../deploy/cloud-run.ps1) is read-only in `Inspect` mode. Mutating modes require an explicit `-Apply`. `Deploy` requires a digest-pinned image, a dedicated service account in the target project and an exact HTTPS frontend origin with no credentials/path; it sets the bounded defaults, `AGENT_ENABLED=false`, deploys a new revision with no default traffic and the stable `candidate` traffic tag, and leaves invocation private unless `-AllowUnauthenticated` is explicitly supplied. It writes only nonsecret environment settings to a unique temporary JSON env-vars file, encodes `BACKEND_CORS_ORIGINS` as a JSON array string for Pydantic Settings, passes that file to gcloud, and removes that exact file in `finally`. Optional Gemini configuration takes only an exact `SECRET_ID:VERSION` reference through Secret Manager; no secret value enters the file or command. The script does not enable APIs, create IAM bindings, build/upload source, or provision a repository.

After prerequisites are approved and a working local Docker engine is available, use only the `backend/` build context:

```powershell
$project = "ecoloop-staging-20261015"
$region = "asia-south1"
$repo = "ecoloop"
$tag = "cc7e12d"
$image = "$region-docker.pkg.dev/$project/$repo/backend:$tag"

docker build --platform linux/amd64 --pull -f backend/Dockerfile -t $image backend
docker push $image
docker inspect --format '{{index .RepoDigests 0}}' $image
```

The final output from `docker inspect` is the immutable `IMAGE@sha256:...` required for deployment. Before the first build/push, create the Artifact Registry Docker repository only after its API/billing/cost gates pass; use the same project and region. Do not use Cloud Build source submission with this checkout because of the ignored local env file.

Deploy a candidate without routing traffic:

```powershell
./deploy/cloud-run.ps1 -Mode Deploy -Apply `
  -Project $project -Region $region -Service ecoloop-api `
  -Image "asia-south1-docker.pkg.dev/ecoloop-staging-20261015/ecoloop/backend@sha256:REPLACE_WITH_VERIFIED_DIGEST" `
  -RuntimeServiceAccount "ecoloop-api@ecoloop-staging-20261015.iam.gserviceaccount.com" `
  -FrontendOrigin "https://REPLACE_WITH_REVIEWED_FRONTEND_HOST"
```

Use `-AllowUnauthenticated` only after the route-level Firebase identity and active-membership checks have been reviewed; the application still must reject missing/foreign identity. If using a Secret Manager key for a separately approved integration, add `-GeminiApiSecretRef "SECRET_ID:VERSION"` after the exact-secret IAM grant is reviewed. Keep `AGENT_ENABLED=false` for this prepared release.

Cloud Run does not accept `--no-traffic` when creating a new service. The first revision therefore serves default traffic as soon as it becomes ready; use an assistant-disabled API image for that first exposure. Subsequent releases can use the candidate tag with `--no-traffic`. The first deployment has no prior revision to roll back to. This behavior was confirmed by the CLI response and follows Cloud Run's [tagged revision rollout flow](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration) and [service deployment behavior](https://docs.cloud.google.com/run/docs/deploying).

For a private service, give the smoke-test caller `roles/run.invoker` on this service. Read the normal service URL and the tagged candidate URL from Cloud Run status, then use a Google identity token whose audience is the **normal service URL**, even though the request goes to the tagged URL:

```powershell
$serviceState = gcloud run services describe ecoloop-api --project $project --region $region --format=json | ConvertFrom-Json
$serviceUrl = $serviceState.status.url
$candidateUrl = ($serviceState.status.traffic | Where-Object { $_.tag -eq "candidate" } | Select-Object -First 1).url
$runToken = gcloud auth print-identity-token --audiences=$serviceUrl
curl.exe --fail-with-body -H "X-Serverless-Authorization: Bearer $runToken" "$candidateUrl/api/v1/health"
```

For a protected API smoke request, retain the Cloud Run token in `X-Serverless-Authorization` and put a Firebase ID token from the approved synthetic sign-in in `Authorization`; this lets Cloud Run IAM authenticate the caller while FastAPI receives and verifies the Firebase token. Do not paste or save either token in the release record. See Google's [service-to-service authentication guidance](https://docs.cloud.google.com/run/docs/authenticating/service-to-service). Browser calls cannot mint this developer IAM token; a browser-facing direct API needs an explicitly reviewed public invoker policy plus the FastAPI Firebase identity and active-membership checks. Use `-AllowUnauthenticated` only after that route-level review.

Inspect the revision and confirm Cloud Run reports Ready. For the 17 October release, health returned 200 with the assistant disabled, unauthenticated household access returned 401, and exact-origin CORS preflight passed. Health does not prove Firebase/Firestore access: the deployed Google sign-in attempt failed before an authenticated API request was observed, so signed-in Firestore access and correct/foreign household acceptance remain open.

Record the currently serving revision before each later release. After the candidate checks pass, promote it explicitly:

```powershell
./deploy/cloud-run.ps1 -Mode Promote -Apply -Revision "ecoloop-api-NEW"
```

To restore the recorded prior revision:

```powershell
./deploy/cloud-run.ps1 -Mode Rollback -Apply -Revision "ecoloop-api-PREVIOUS"
```

Rollback reassigns 100% traffic to the supplied revision; it does not delete revisions, undo database writes, or revert secrets/IAM. Capture the prior revision name and current traffic split in the release record before promotion. For the first deployment there is no prior revision to roll back to.

## Session journal

2026-10-17: Inspected the architecture, decisions, past mistakes, latest household acceptance session, current MVP contract, implementation plan, project status, backend container/settings examples, and the two applicable deployment/FastAPI skills. Inspected project state with read-only `gcloud` commands and verified Cloud Run revision-tag, no-traffic, and private IAM token behavior in official Google Cloud documentation. Prepared a parameterized deploy/traffic helper and this readiness record. A follow-up caught that Pydantic Settings JSON-decodes list environment fields before its validator; deployment now writes `BACKEND_CORS_ORIGINS` as a JSON array string in a unique temporary environment file and removes only that file in `finally`. PowerShell parsing passed, and the actual `Settings(_env_file=None)` class parsed a synthetic process environment into `['https://app.example.com']`; validation loaded the class AST without its module-level settings instance so no `.env` was opened. No application tests/builds or container build occurred. Docker daemon unavailable; billing/budgets not live-verifiable; no API enablement, billing change, IAM mutation, secret read, service creation, or deployment occurred. Current decision pointers: [architecture](../knowledge/ARCHITECTURE.md), [decisions](../knowledge/DECISIONS.md), [current MVP spec](../planning/CURRENT_MVP_SPEC.md), [implementation plan](../planning/IMPLEMENTATION_PLAN.md). No new architectural decision was made.
