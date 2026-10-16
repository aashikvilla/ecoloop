# Household onboarding and live acceptance — 17 October 2026

## Scope and authority

The user authorized the smallest household onboarding/sign-out implementation, synthetic test identity, live database read/household creation checks, and one bounded synthetic AI interaction. The existing reviewed ownership split was respected: root integrated frontend/API acceptance and docs; `codex/household-create-api` owned household endpoint; `codex/household-onboarding-ui` owned the UI; `codex/real-household-agent` owns `backend/app/agents/household.py` and must not be modified or merged without handoff and review. No unit tests, env-file reads, billing, deployment, or index writes were performed.

## Results

- Integrated onboarding and race-safe idempotency UI/API on `codex/demo-integration` through `1ea3593`; branch is eight commits ahead of `origin/codex/demo-integration`.
- Logged in via Email/Password with synthetic `judge-demo@ecoloop.example` / UID `ecoloop-judge-demo`.
- Read seeded Kitchen and empty Shopping; wrong-household request returned 403.
- Created synthetic household `EcoLoop Test Kitchen` / `d8e5ef4cb23b4925a383ae1ae29792c5`; API returned 201 and authenticated Kitchen read returned empty. Signed out; UI returned to signed-out state.
- Password is deliberately not committed or written to project docs.
- One Ask request failed locally converting numeric Pydantic `Literal` values in the ADK/google-genai output schema (`ValueError: Literal values must be strings`) before a provider request. UI eventually timed out. No model response is claimed. Assistant-enabled local backend was stopped; no retry attempted.
- Current integration includes commits `2452267`, `4d17fb7` (household create), `5e837a7`, `9c49b3b`, `2e531ab` (onboarding UI) merged sequentially.
- PR #1 remains draft/open/clean with no reviews or checks. `main` unchanged. No merge to main is eligible.

## Verification and live state

The manual browser/API evidence is in [onboarding acceptance](../../evidence/onboarding-live-acceptance-2026-10-17/README.md). No unit tests run. The local frontend development server remains active on port 3003; backend on 8001 was stopped after the AI schema failure. Share/activity indexes remain undeployed. Browser mutations remain disabled by default. Managed ADK runtime, Sessions, Memory Bank, deployment and phase-exit evidence remain open. See [status snapshot](../../STATUS.md), [execution plan](../../planning/PARALLEL_EXECUTION.md), [current spec](../../planning/CURRENT_MVP_SPEC.md), and [architecture](../ARCHITECTURE.md).

## Next bounded steps

1. Obtain explicit handoff/review from the separate agent-module owner for the output schema conversion correction; do not edit their file from this branch.
2. Once corrected, repeat only one bounded synthetic Ask flow, recording whether a provider request occurred and its actual outcome.
3. Finish indexed private-history checks after separately authorized index deployment; keep write flag false until acceptance and explicit owner approval.
4. Review M0–M5 prerequisites/exit evidence and keep PR #1 draft until the relevant phase gates truly pass.

## Lesson

An HTTP preflight or UI “asking” state is not evidence that a model request reached the provider. Instrument and report each boundary separately; preserve ownership when a provider integration defect occurs.
