# Agents CLI evaluation preparation — 17 October 2026

## Scope

Prepared a small synthetic prompt dataset and operator instructions for later ADK response evaluation, and refreshed the backend README to reflect current read-only tool scope and managed-service status. This is documentation and fixture preparation only. No model, agents-cli eval, cloud, environment file, provisioning, deployment, or unit test activity occurred.

## Files

- `backend/docs/eval/household-assistant.synthetic.json` — seven fabricated prompts covering scope refusal, untrusted content, read-only behavior, proposal boundaries, grounded cards, explicit preference consent, and revoked-preference handling.
- `backend/docs/eval/README.md` — prerequisites, future CLI commands, trace privacy and cost controls, plus limitations of prompt evaluations.
- `backend/README.md` — current API/tool/service boundaries and links to the eval preparation.
- `docs/knowledge/PAST_MISTAKES.md` — records that prompt quality scores are not authorization evidence.

## Findings and limits

The backend's assistant is reached through authenticated FastAPI and currently does not export a standalone ADK app or provide an Agents CLI manifest. A compatible, reviewed adapter must exist before the documented CLI commands can run locally. Managed Runtime is still absent; managed adapters are configured/unverified. Therefore no run is currently authorized or possible by these docs alone.

The prompt dataset is not an isolation, revocation, schema, membership, or no-write test. Keep these as deterministic integration/security acceptance. Any later model evaluation needs an explicit per-run spend limit and broader service cost controls; traces require privacy review before expansion.

## Verification

Reviewed the dataset and instructions against `.agents-cli-spec.md`, `docs/planning/AGENT_PLATFORM_PLAN.md`, and official Agents CLI evaluation documentation. No application checks were run. Architecture pointer: `docs/knowledge/ARCHITECTURE.md`.
