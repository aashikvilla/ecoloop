# AI and Cloud Run review — 17 October 2026

The latest direct user request authorized AI fixes, three parallel GPT-6 Luna/high reviews and Cloud Run preparation. Root remains integration owner. Workers used isolated branches; separately owned `codex/real-household-agent` and `codex/docs-cleanup` were preserved. No env-file inspection, credentials in commits, unit tests, billing activation or cloud provisioning/deployment.

## Pushed work and verification

- `9947778`: Ask timeout 70 seconds, other transport requests remain 12 seconds.
- `2a94350`: Ask state keyed by auth/UID/household and outstanding requests cancelled on scope change. Independent reviewer found no concrete leakage/race defect.
- `fbc8f08`: truthful assistant availability copy, without claiming a configuration cause for every provider failure.
- `codex/feature-genui-audit` / `8a79a7c`: complete [source audit](../../implementation/feature-genui-audit-2026-10-17.md), integrated. One runtime ADK agent, no tools/subagents; five validated card renderers, approval unavailable. Coding workers are separate from the product runtime.
- `codex/ai-schema-fix` through `83786a1`: fixes SDK conversion by using raw JSON Schema. Full ADK request conversion passed offline with a dummy key; strict valid card accepted and string schema version rejected. Integrated and pushed through `ab27be8` before final investigation.
- `codex/cloud-run-ready` / `49ded68`: reviewed deploy helper, JSON CORS configuration, dedicated same-project identity checks, private invocation defaults, candidate tag and rollback plan. Integrated/pushed through `b5b3e5c`. PowerShell parsing and synthetic settings encoding checks passed. No image build; Docker daemon unavailable.
- Current frontend lint and TypeScript checks passed. No unit tests or production/image build claimed for this wave.

## Live provider observations

The first literal-only repair exposed further discriminator/oneOf SDK conversion errors before any provider request. The raw JSON Schema repair passed the full offline converter and a signed-in Ask request reached Google, which returned `400 INVALID_ARGUMENT`; FastAPI returned 503 and browser displayed unavailability. No AI answer, successful card generation, or usage/cost measurement is claimed. A final bounded JSON-mode investigation is underway; its result must be recorded before claiming provider success. Model `gemini-3.1-flash-lite`, synthetic household facts only, 1,536 output tokens and 30-second model budget; browser deadline 70 seconds. Google pricing lists a free tier for this model, but account charge/usage is not inferred from documentation.

## Deployment and remaining units

Read-only cloud checks confirmed target ACTIVE and Cloud Run/Cloud Build/Artifact Registry/Secret Manager APIs disabled. No dedicated runtime account exists in the listed set. Billing API queries failed even with explicit target quota project; Console billing page failed to load, so current linkage/budget/credits remain unverified. Prior billing-off observation is historical. No retry or activation was made. See [deployment readiness](../../implementation/cloud-run-readiness.md).

Next units: actual validated model/card response; bounded scoped read/calculation tools; persistent explicit proposal approval; canonical intake/review and item detail; managed Sessions/consented Memory Bank; indexed history and write/conflict/retry acceptance; reviewed billing/IAM/cost controls and image/deployed E2E. Explicit older Ask context IDs beyond newest 200 observations are a known open limitation. Browser writes stay default-off. All full phase gates and `main` merge remain open.

Architecture/decision pointers: [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md), [current status](../../STATUS.md), [execution plan](../../planning/PARALLEL_EXECUTION.md). Lesson recorded in Past Mistakes: partial schema transformation, full SDK conversion, actual provider acceptance and response validation are separate proof boundaries. Usage reached 89% five-hour / 48% weekly; no reset credits used. Preserve a pushed checkpoint before ending work.
