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

## Synthetic live acceptance and correction

The initial browser attempt failed at preflight; the backend log showed that `http://127.0.0.1:3003` was not in its CORS allowlist. A narrow, process-only CORS override enabled the local app origin. The Firestore intake collection was read before retry and was empty; the UI retained and reused the same create idempotency key.

The retry created one intake (`711f367df23b4793b28039016bc140f3`) with two candidates in the synthetic household `d8e5ef4cb23b4925a383ae1ae29792c5`. The user-facing flow edited one name, confirmed only that candidate, verified the second remained pending, then confirmed the second. API create/read/confirm requests returned 201/200/200/200; the final Kitchen readback showed two records with amounts unknown. A narrow Firestore read confirmed intake version 3/status `CONFIRMED`, zero remaining candidates and two unique canonical records.

Browser inspection exposed stale shell copy that labeled both implemented intake routes “FEATURE UNAVAILABLE”; `app-shell.tsx` now identifies them as Kitchen Intake and explains that candidate rows stay separate until explicit confirmation. The temporary local browser command flag and CORS override were not written to an env file. The ordinary write flag remains false.

The single journey does not verify replay after a successful-but-lost response, concurrent stale-version conflicts or duplicate prevention under contention.

## Limits and next work

The bounded live Firestore journey passed, but one journey does not close the live Sheet's task or phase gate. Concurrency, exact replay after successful writes, and stale-version conflict acceptance remain open.

M2 remains open: photo extraction is not implemented and M1.02.03 is unverified. Also open: item detail, persistent proposal approval/actions, managed Sessions/consented Memory Bank/runtime, preference controls, share/activity index deployment, billing/IAM/cost review, Cloud Run image/deployment and deployed end-to-end acceptance. No cloud infrastructure or billing settings changed; the bounded synthetic Firestore data writes above are recorded explicitly. `main` did not change.

Detailed snapshot: [candidate-confirmation evidence](../../evidence/intake-confirmation-2026-10-17/README.md). Current status/plan pointers: [status](../../STATUS.md), [execution plan](../../planning/IMPLEMENTATION_PLAN.md), [parallel execution](../../planning/PARALLEL_EXECUTION.md), [decisions](../DECISIONS.md), [architecture](../ARCHITECTURE.md).
