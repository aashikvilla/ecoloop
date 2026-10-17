# Synthetic ADK evaluation preparation

`household-assistant.synthetic.json` contains seven fabricated prompts. It contains no identities, household facts, preference text from a real person, credentials, or production traces. The prompts cover scope refusal, untrusted household content, read-only behavior, typed proposal boundaries, grounded card use, explicit preference consent, and revoked preference handling.

## Status and limits

This is a prepared dataset, not evaluation evidence. No `agents-cli eval`, model, provider, or cloud request was made to create or verify it. The documented `agents-cli eval run --dataset ... --metrics ... --output ...` options and dataset shape match the official CLI reference, but the current backend does not expose a standalone ADK app for Agents CLI and has no `agents-cli-manifest.yaml`; local CLI inference cannot run against this repo until a reviewed adapter/app export exists. The FastAPI assistant endpoint is authenticated and must not be bypassed to make CLI evaluation convenient. Agents CLI 1.10.0 was installed on native Windows, where its help command stalled; Google officially supports Windows through WSL 2, not native Windows.

Prompt evaluation is a quality signal only. These prompt-only cases do not supply verified user or household identities, do not establish separate sessions or Firestore state, and cannot prove isolation, revocation deletion, fixed-card schema validity, membership checks, or zero canonical writes. Prove those through deterministic boundary/integration acceptance separately. An LLM judge score is not authorization or safety proof.

## Run later, only after gates pass

Before a run, an operator must:

1. Review `docs/planning/AGENT_PLATFORM_PLAN.md` and record the owner-approved per-run cost limit and cost controls for every service involved. The existing Gemini-only cap does not bound Agent Engine or other service spend; budget alerts alone are not a hard stop.
2. Confirm managed runtime/session readiness and the required project, region, IAM, quota, billing, and service-specific controls. The managed runtime is currently absent and managed adapters are unverified; this gate is not currently met.
3. Prepare and review an Agents CLI-compatible ADK app/manifest that invokes the intended agent while retaining its trusted identity/scope boundary. Do not expose a test-only unauthenticated tool path. The current backend has no such adapter.
4. Check the current CLI reference and active project/account before enabling credentials. `eval run` invokes agent inference and grading; both may call models. No command below is cost-free.
5. Decide where traces may be stored, who may review them, and how they will be deleted. Inspect generated traces for private data before broadening the dataset.

From `backend/`, after the local adapter is prepared and all gates are recorded, a local CLI-compatible app can be evaluated with:

```powershell
agents-cli eval run `
  --dataset docs/eval/household-assistant.synthetic.json `
  --metrics general_quality,instruction_following,tool_use_quality `
  --output artifacts/household-eval
```

For a deliberately approved, compatible managed endpoint, use the CLI's endpoint mode instead (replace placeholders only after review):

```powershell
agents-cli eval run `
  --dataset docs/eval/household-assistant.synthetic.json `
  --url "<approved-agent-endpoint>" `
  --app-name "<approved-adk-app-name>" `
  --metrics general_quality,instruction_following,tool_use_quality `
  --output artifacts/household-eval
```

Do not use `agents-cli eval dataset synthesize`, `eval optimize`, or `eval submit` for this preparation: synthesis and optimization invoke models, while submit invokes a cloud evaluation service. After an approved run, inspect each trace and its cost, redact/delete traces as required, and report which deterministic acceptance checks were performed separately. On Windows, use WSL 2 as documented by Google; verify the CLI/backend adapter version before running.
