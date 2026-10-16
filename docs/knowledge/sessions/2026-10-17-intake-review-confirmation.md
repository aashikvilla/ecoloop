# Candidate review and explicit confirmation — 17 October 2026

## Context and authority

Resumed the authorized local EcoLoop MVP implementation on `codex/demo-integration`. Read `AGENTS.md`, the current MVP spec and execution plan, architecture, decisions, past mistakes, the current parallel plan, latest AI/Cloud Run session, status snapshot, worktrees, PR #1, active chats/agents and the live MVPTasks rows. The separate implementation-review chat is idle and its previously owned `codex/docs-cleanup` and `codex/real-household-agent` branches were left untouched. No reset credit was consumed; ordinary usage was allowed at 17% of the 5-hour window and 51% weekly, with one available but unused reset credit.

PR #1 remains an open draft against unchanged `main`; it had no CI checks or human reviews. The integration tree was clean at `88d6db2` before this wave. The root API health route is `/api/v1/health`; local backend health returned `healthy`, provider `gemini_developer_api`, assistant enabled. This health endpoint does not call the provider. The local frontend served `/ask` with HTTP 200. The preceding session contains the evidence for the single successful Gemini/ADK/Firestore-context card response; this session did not call a model.

## Implementation and review

Two GPT-6 Luna/high workers used separate worktrees and branches, followed by independent critical review:

- `codex/intake-confirmation-api`: `824624f` implements owner-only candidate confirmation. `171e9e5` binds idempotency to both intake ID and command, fixing review finding P2: the same body/key can no longer replay a successful result against a different intake. The fix leaves create-intake hashing unchanged.
- `codex/intake-confirmation-ui`: `bf48485` adds candidate loading/editing and consented confirmation. `8123384` handles partial confirmations, `4c22aea` unwraps the shared API envelope and replaces the empty completed-record list with a truthful summary, and `f40da8b` resolves lint/type issues in the effect lifecycle and ready UI.
- Independent final API/UI reviews found no remaining concrete static findings. The integration merged the API and UI sequentially at `50ce49b`, `29246c1`, and `69a6e8e`.

The UI requires a separate consent checkbox, edits candidate fields and selected rows, sends a current auth token, scopes/aborts on UID/household/intake changes, and preserves the exact idempotency command for manual retry after ambiguous outcomes. Confirmation POST uses the existing default-off browser command flag. The API rechecks membership/creator/version and candidate IDs, writes selected Kitchen facts atomically, and retains unselected rows as pending.

## Verification

- Frontend ESLint passed.
- Frontend TypeScript (`tsc --noEmit`) passed after an initial unreachable-state comparison was corrected.
- Next production build passed and generated all 14 static pages, including `/kitchen/review`.
- Backend Python compilation passed.
- `git diff --check` passed.
- Agent branches included Pydantic wire checks and the target-intake idempotency fingerprint check.
- No frontend/backend unit tests were added or run.

## Limits and next work

No live Firestore intake or canonical write was performed, the browser command flag was not enabled, and no browser confirmation journey was run. Firestore transaction execution, concurrency, retries and readback still need approved synthetic acceptance. Local build/static review cannot close the live Sheet's tasks.

M2 remains open: photo extraction is not implemented, M1.02.03 is unverified, and live create/edit/partial/full confirmation plus Kitchen readback and conflict/retry acceptance are absent. Also open: item detail, persistent proposal approval/actions, managed Sessions/consented Memory Bank/runtime, preference controls, share/activity index deployment, billing/IAM/cost review, Cloud Run image/deployment and deployed end-to-end acceptance. No cloud resources, billing settings, Firestore data, or main branch changed.

Detailed snapshot: [candidate-confirmation evidence](../../evidence/intake-confirmation-2026-10-17/README.md). Current status/plan pointers: [status](../../STATUS.md), [execution plan](../../planning/IMPLEMENTATION_PLAN.md), [parallel execution](../../planning/PARALLEL_EXECUTION.md), [decisions](../DECISIONS.md), [architecture](../ARCHITECTURE.md).
