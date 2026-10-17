# Kitchen observation correction — 17 October 2026

## Context and authority

Resumed authorized local EcoLoop work on `codex/demo-integration`. Read the project contract, current execution/parallel plans, architecture/decisions/past mistakes, latest AI/Cloud Run and intake session notes, current worktrees/branches, PR #1, active chats/agents and ordinary usage. Usage was available at 25% of the five-hour window and 52% weekly; one reset credit remained unused. PR #1 stayed an open draft with no CI checks or human reviews. The integration branch was clean at `4cecab5` before this slice.

User history authorizes local implementation, isolated GPT-6 Luna parallel work, and prior bounded synthetic account/AI acceptance. This pass made no provider request or browser/database write. No environment file was read. Billing, cloud provisioning and deployment were not performed.

## Work and review

Three isolated worktrees handled: (1) a narrow item-detail correction UI; (2) a critical review of the existing fact-confirm transaction and two schema fixes; (3) a read-only photo storage/extraction gate audit. The owner-owned `codex/docs-cleanup` and `codex/real-household-agent` branches were not touched.

- Backend commit `2c58ba2` allows a confirmed fact amount of zero through `NonNegativeAmount` while preserving the positive `Amount` alias elsewhere. It also rejects `date_source` when the date is unknown. Root independently reviewed the diff and integrated/pushed as `f29fd50`.
- UI commit `390175f` adds explicit correction review/confirmation on item detail through the existing allowlisted `facts/confirm` request. It retains stable item ID and version, unknown values, manual same-command retry after ambiguous outcomes, and conflict reload; it respects the default-off write flag. Independent critical review found no actionable findings. Root integrated as `4244a0c`.
- Initial root lint/TypeScript checks identified a synchronous state update in an effect and seven impossible phase comparisons. Root changed draft initialization to occur on user action. ESLint, `tsc --noEmit` and `git diff --check` then passed. The UI worker had stopped its isolated dependency install after it failed to produce local tools, so checks ran from the existing root frontend dependencies. No unit tests or env-backed build ran.
- Pushed integration cleanup `da19e9a`; evidence is in [item correction](../../evidence/item-correction-2026-10-17/README.md).

## Current service observations

A read-only request to the local backend health endpoint returned `healthy`, provider `gemini_developer_api`, configured `true`, enabled `false`, status `disabled`, runtime check `not_performed`, session store `in_memory_unmanaged`, managed Sessions `false`, managed Memory `false`. Health does not call the provider. A real Gemini card response is recorded in the earlier AI session, but this pass did not repeat that request and the currently running API will not answer an assistant turn while disabled.

The photo gate audit found `storage.rules` denies all object access, `firebase.json` has no Storage upload lifecycle configuration, and no private upload/finalize or extraction endpoint exists. The smallest safe first local step is a media lifecycle contract/control plane; user-facing upload and Gemini extraction need a private bucket, narrowly scoped backend identity/upload, retention and retry handling, plus separate owner-reviewed cost/privacy setup.

## Remaining work

- The item editor is prepared but was not exercised against Firestore. Authenticated write, zero value, stale-version conflict, exact replay after ambiguous success, and concurrent behavior remain open. M2.02.01 is still blocked by M2.01.03 and its review evidence.
- Photo extraction, private media lifecycle, managed ADK Runtime/Sessions/consented Memory Bank, proposal persistence/approval, share/activity index deployment, and full E2E remain incomplete.
- Latest Cloud Run readiness evidence still does not establish billing linkage/budget, required APIs, runtime identity, image build, deployed health, or deployed whole-flow acceptance. Do not merge `main` or mark a phase complete from this work.

## Continuation pointers

See [current status](../../STATUS.md), [implementation plan](../../planning/IMPLEMENTATION_PLAN.md), [parallel execution](../../planning/PARALLEL_EXECUTION.md), [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md), and [correction evidence](../../evidence/item-correction-2026-10-17/README.md).
