# Candidate intake and selected AI context — 17 October 2026

The owner asked to continue implementation in parallel after confirming the existing worktrees were integrated. Usage was available at 9–10% of the five-hour window and 50% weekly; no reset credit was used.

## Worktree reconciliation

The root was clean on `codex/demo-integration` at `f3e4f43`, synchronized with origin. All 13 existing registered worktrees were clean. Patch-equivalence checks found no worktree-specific commit absent from the integration branch. PR #1 remained an open draft against `main`; `main` had not been updated because the phase gates remain open.

## Changes and evidence

- `codex/selected-context-tools`, commit `13b2bbc`, fixes selected assistant context reads: exact IDs are fetched directly inside the verified household path; at most 20 are considered in request order; missing records are omitted. Empty selection keeps the recent bounded query. Python compilation and `git diff --check` passed. Integrated/pushed at `0883106`.
- `codex/manual-intake-api`, commits `3eedf65` and `dd8051d`, adds bounded manual/text candidate persistence and creator-scoped reads at `/api/v1/intakes`. Schema validation accepts canonical JSON ISO dates, strict enum values and positive quantities; zero is not a stored amount. The transaction rechecks membership and binds idempotency to actor and payload. The API stores under the household `intakes` collection, with no write to `food_observations` and no model call. Independent critical review found no concrete finding in scope, idempotency or stock mutation. A local schema check with an ISO date, Python compilation and whitespace checks passed. Integrated/pushed at `8bb669f`.
- `codex/manual-intake-ui`, commits `497e455`, `56c3dcd` and `95a3e8d`, wires `/kitchen/add` for one manual entry or up to ten text names, shows unconfirmed candidates and retains the idempotency key for exact retries. Inputs remain gated by `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS`. Scope changes remount the capture component and abort prior requests. Root integration caught a render-time ref write and a TypeScript response-narrowing error; the worker corrected both before final integration. Integrated/pushed at `327af6b`.
- On integrated code, ESLint and TypeScript checks passed. Python compilation, JSON-date schema check and `git diff --check` passed. No unit tests ran. No browser write or live intake DB mutation was performed; Firebase reads and the earlier single AI card remain the last live acceptance evidence.

## Remaining gates

Candidate correction/confirmation, photo extraction, item detail, preference controls, persistent proposals/approval, managed Sessions/Memory Bank/Runtime, live indexed history/write acceptance, Cloud Run APIs/runtime identity/image, reviewed billing/cost controls and deployed end-to-end evidence remain open. The existing browser write flag remains off; no MVPTasks phase status was advanced and no merge to `main` is eligible.

Current plan/status pointers: [parallel execution](../../planning/PARALLEL_EXECUTION.md), [implementation status](../../STATUS.md), [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md). No new architectural decision was made; candidates remain separate from confirmed facts until explicit confirmation.
