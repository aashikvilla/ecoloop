# Canonical Kitchen item detail — 17 October 2026

## Scope

The read-only slice adds links from confirmed Kitchen records to `/kitchen/items/{id}` and renders the matching observation from the existing authenticated, household-scoped Kitchen API read. No new API or mutation was added. The page exposes record version, amount, date/type/source where supplied, storage and observation time; missing values stay unknown. It states that the API does not assess freshness or safety and that an unmatched ID may fall outside the endpoint's 200-record response cap. Existing Account outcome/sharing controls are linked without copying their command flows.

## Review and verification

- Implemented on isolated branch `codex/kitchen-item-detail`, commit `068e2f5be2782c6edde0f72ff460660751909058`; integrated as `50ea53b` on `codex/demo-integration`.
- Independent two-pass review found no actionable critical or informational findings.
- Isolated worktree: ESLint, TypeScript, production build and `git diff --check` passed.
- Integration checkout: ESLint and TypeScript passed; `git diff --check` passed.
- The redundant integration rebuild was stopped after Next.js announced it loads ignored `.env.local`. No environment file contents were inspected. The isolated worktree build completed before integration.
- Root dev server returned HTTP 200 for Kitchen and a synthetic item URL. Browser review confirmed the item route displays its signed-out state and the correct shell label; no authenticated item payload or mutation was exercised.
- No frontend/backend unit tests ran. No backend changes, cloud calls or browser writes occurred in this slice.

## Limits and next work

This provides detail for records present in the current Kitchen list response; it does not add a single-item API, edit/recheck flow, stale-version recovery, or contextual item preselection in Account commands. A missing match is therefore not proof that a record does not exist. M2.02.01 remains open, as does its M2.01.03 prerequisite/exit review. PR #1 is still a draft and `main` is unchanged.
