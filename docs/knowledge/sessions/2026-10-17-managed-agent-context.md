# Managed agent context — 17 October 2026

## Request

The owner asked whether the three-request daily cap was imposed by EcoLoop, requested a larger allowance or lower-cost model, and asked to enable managed Sessions and Memory Bank.

## Finding and changes

The cap was ours: `.github/workflows/deploy-main.yml` set `AI_DAILY_REQUEST_LIMIT=3`; backend and manual deploy defaults were already 12. Raised the deployment value to 12 per UID per UTC day. It covers both assistant and photo candidate calls, and failed calls reserve a slot. Kept Gemini 3.1 Flash-Lite with `MINIMAL` thinking: this is a low-cost model already, while the issue was our own app quota.

Added `AGENT_VERTEX_ENGINE_LOCATION` independent of the model endpoint location. Assistant inference stays on Vertex `global`; managed Session and Memory Bank resources use `asia-south1`. Updated the local Cloud Run helper and main deployment workflow to configure a 24-hour managed-session TTL, opt-in Memory Bank, and configuration smoke checks. Manual workflow dispatch defaults to candidate-only. Traffic promotion is additionally gated by the GitHub variable `ECOLOOP_MANAGED_CONTEXT_ACCEPTED=true`; it remains false until authenticated acceptance is reviewed. Main pushes automatically deploy/promote after that gate is opened.

Created the blank Agent Engine resource `projects/ecoloop-staging-20261015/locations/asia-south1/reasoningEngines/8405027522533654528` with no managed Runtime agent. Added its numeric ID as the GitHub Actions variable `ECOLOOP_AGENT_ENGINE_ID`. The existing Cloud Run service identity already has `roles/aiplatform.user`, which includes Session and Memory Bank permissions; made no IAM change.

## Verification and limitations

- Backend `compileall`, locked dependency check, deployment-workflow YAML parse, PowerShell parser, and `git diff --check` passed.
- No unit tests, model requests, session operations, Memory Bank writes, preference sync, data seeding, or Cloud Run deployment were performed.
- Resource creation finished successfully, but managed Sessions and Memory Bank remain configured-unverified until real authenticated persistence, consent, isolation, and deletion checks pass. Deployment health checks validate configuration only; they do not substitute for this acceptance.
- The current Cloud Run revision still reports `in_memory_unmanaged` and `not_configured`; feature code is not yet deployed.
- The ₹2,000 all-services budget remains alerts-only, not a hard cap. Credits and total-project spend enforcement remain unverified.

## Checkpoint

Feature branch: `feature/managed-agent-context`. Next: complete local review, push the branch, run the deployment workflow manually as candidate-only, verify authenticated managed session persistence and explicit preference sync/revoke against a synthetic test account, then promote only after those checks pass. Do not merge to `main` before the M3 acceptance prerequisites are reviewed. No real environment file or secret was read or written.
