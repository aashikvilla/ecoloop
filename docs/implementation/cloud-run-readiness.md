# Cloud Run readiness — 17 October 2026

## Scope and disposition

This is a deployment preparation record for the existing FastAPI backend. It did not enable APIs or billing, create IAM identities/resources, build or push an image, read a secret value or environment file, or deploy a service. Deployment remains blocked pending owner review of billing/cost controls and cloud access, a usable Docker daemon or another approved local build host, and the prerequisites below.

The target is the single project `ecoloop-staging-20261015` (`EcoLoop Hackathon`). The working region recommendation is `asia-south1`, matching the existing Firestore database. Verify Cloud Run availability, quotas, and regional costs before provisioning. The script requires project, region, service, image digest, a dedicated runtime service account and the exact HTTPS frontend origin as inputs; its defaults are `ecoloop-staging-20261015`, `asia-south1`, and `ecoloop-api`.

The existing [backend Dockerfile](../../backend/Dockerfile) is suitable as a starting point: Python 3.12 slim base image is pinned by digest, `uv` and dependency lock are used, the runtime drops root, and Cloud Run's injected `PORT` is honored. The build context must be `backend/`; its [.dockerignore](../../backend/.dockerignore) excludes `.env` and other environment files (while allowing `.env.example`). The Dockerfile copies only the lock/project metadata and `app/`. Do not use the repository root as build context or upload the backend source tree to Cloud Build: a real ignored `backend/.env` exists locally, and `.dockerignore` is not the source-upload policy for Cloud Build.

## Read-only audit evidence

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

`docs/STATUS.md` is a dated project snapshot, not a substitute for live verification. Recheck billing and budget state through an authorized billing account context before asking for deployment approval. In particular, existing project knowledge records that a closed billing account may still be linked to another active project; reopening it could affect that project. Do not reopen it as part of this preparation.

## Access and cost prerequisites

Provision a dedicated service identity only after billing/API/region review. Grant the runtime identity the narrow Firestore data role needed for the backend (`roles/datastore.user` on this single project). Do not give it Owner, Editor, Firebase Admin SDK roles, service account key files, or permission to impersonate unrelated identities. If a reviewed assistant integration later needs `GEMINI_API_KEY`, grant `roles/secretmanager.secretAccessor` on that one secret to the runtime identity only; bind an exact version in Cloud Run. Secret Manager is not required while assistant calls remain disabled.

The deploy identity is separate from the runtime identity. It needs the narrow release permissions for Cloud Run, Artifact Registry image reads and `iam.serviceAccounts.actAs` on only this runtime identity. Do not add those grants in this branch; current IAM is only observed, not changed.

Required operational gates before rollout:

- Verify the billing account state, every project linked to it, available credits (or record unknown), and the project budget alert. Do not enable billing until the linked-project impact is reviewed and cost controls are approved.
- Review APIs to enable only when authorized: `run.googleapis.com`, `artifactregistry.googleapis.com`, and the minimum dependencies confirmed by the chosen flow. Local Docker build/push avoids uploading source to Cloud Build; do not enable `cloudbuild.googleapis.com` merely as a fallback.
- Check regional quota and repository/service availability in `asia-south1` before creating either resource.
- Confirm the actual frontend HTTPS origin; the script rejects wildcard, HTTP, or path-bearing CORS origins. Confirm Cloud Run ingress and unauthenticated invocation policy. Browser Firebase ID tokens are verified by the FastAPI app, so public invocation is only appropriate after reviewing every route's app-level auth boundary.
- Keep `AGENT_ENABLED=false`. The current backend has no durable per-actor assistant rate limit/cost gate. Public `AGENT_ENABLED=true` is blocked until that control, consent/privacy, provider selection, managed Sessions/Memory requirements, and the previously observed ADK numeric-`Literal` schema failure are resolved and accepted. Attaching a key alone does not authorize model calls.
- Start with Cloud Run minimum instances `0`, maximum instances `1`, concurrency `20`, one CPU, `512Mi`, and a `60s` request timeout. This bounds idle compute and scale-out only; it is not a spend cap. Add/verify quotas and alerting for any paid provider calls.
- Keep one Cloud Run service and one project/environment. No staging/production split is introduced.

## Prepared release and rollback flow

The PowerShell helper at [deploy/cloud-run.ps1](../../deploy/cloud-run.ps1) is read-only in `Inspect` mode. Mutating modes require an explicit `-Apply`. `Deploy` requires a digest-pinned image, a dedicated service account in the target project and an exact HTTPS frontend origin with no credentials/path; it sets the bounded defaults, `AGENT_ENABLED=false`, deploys a new revision with no traffic, and leaves invocation private unless `-AllowUnauthenticated` is explicitly supplied. It writes only nonsecret environment settings to a unique temporary JSON env-vars file, encodes `BACKEND_CORS_ORIGINS` as a JSON array string for Pydantic Settings, passes that file to gcloud, and removes that exact file in `finally`. Optional Gemini configuration takes only an exact `SECRET_ID:VERSION` reference through Secret Manager; no secret value enters the file or command. The script does not enable APIs, create IAM bindings, build/upload source, or provision a repository.

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

Inspect the revision, confirm Cloud Run reports Ready, then call `GET /api/v1/health` and verify that it reports assistant disabled without contacting a provider. Health does not prove Firebase/Firestore access. Before routing traffic, verify a synthetic authenticated request with the correct and a foreign household, confirm expected 401/403 behavior, and complete the approved browser/API smoke path. No such deployed verification is claimed here.

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

2026-10-17: Inspected the architecture, decisions, past mistakes, latest household acceptance session, current MVP contract, implementation plan, project status, backend container/settings examples, and the two applicable deployment/FastAPI skills. Inspected project state with read-only `gcloud` commands. Prepared a parameterized deploy/traffic helper and this readiness record. A follow-up caught that Pydantic Settings JSON-decodes list environment fields before its validator; deployment now writes `BACKEND_CORS_ORIGINS` as a JSON array string in a unique temporary environment file and removes only that file in `finally`. PowerShell parsing passed, and the actual `Settings(_env_file=None)` class parsed a synthetic process environment into `['https://app.example.com']`; validation loaded the class AST without its module-level settings instance so no `.env` was opened. No application tests/builds or container build occurred. Docker daemon unavailable; billing/budgets not live-verifiable; no API enablement, billing change, IAM mutation, secret read, service creation, or deployment occurred. Current decision pointers: [architecture](../knowledge/ARCHITECTURE.md), [decisions](../knowledge/DECISIONS.md), [current MVP spec](../planning/CURRENT_MVP_SPEC.md), [implementation plan](../planning/IMPLEMENTATION_PLAN.md). No new architectural decision was made.
