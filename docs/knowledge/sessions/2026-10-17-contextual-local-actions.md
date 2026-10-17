# Contextual Kitchen actions and Shop editing — 17 October 2026

## Scope and authority

Implemented on the isolated `codex/local-actions` branch, rebased onto integrated commit `5948ab5`. Scope covers direct item outcome/share routes, inline Shop add/update/archive, and the canonical API command paths needed for those actions. The household specification and existing reviewed Account command controls remain authoritative.

No real environment files were read, no cloud/provider calls or database writes were made, and no deployment was attempted. The command flag remains owned by the integrator. User-requested local E2E acceptance is still separate from static checks.

## Implementation

- Kitchen item details link directly to an outcome route and a private owner-reported share route. Both routes reuse the existing Account `OutcomeControls` and `ShareControls`, seed the selected item from a current household read, and preserve explicit review, version and idempotency handling.
- Shop displays canonical entries with inline add/update/remove entry points. Add/update reuse `CanonicalCommandControls`; removal uses a new strict archive schema, transactional membership/version/idempotency checks, and soft archive semantics. The existing bounded list read filters archived rows without a new composite index. No action changes Kitchen stock or implies purchase.
- The shared shell recognizes the new item action routes. Its command-scope ref update moved from render into the existing scope effect to pass the React refs lint rule.

## Verification and limits

- `npm run lint` in `frontend/`: passed.
- `npx tsc --noEmit` in `frontend/`: passed.
- Python compile check was unavailable: Windows exposed only the Microsoft Store `python3` alias and no project virtual environment.
- No browser/database E2E or archive transaction execution was performed in this branch. The integrator must register the new archive router and include the narrow PATCH route in local CORS/API wiring before end-to-end acceptance.

## Continuation pointers

See [the current MVP specification](../../planning/CURRENT_MVP_SPEC.md), [architecture](../ARCHITECTURE.md), [decision register](../DECISIONS.md), and [end-to-end readiness audit](2026-10-17-e2e-readiness-audit.md). The archive API route is `PATCH /api/v1/shopping/{entry_id}` with entry ID, base version, actor-bound idempotency key and `archived: true`.
