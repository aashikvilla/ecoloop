# Remove local demo routes — 17 October 2026

## Changes

Removed the remaining synthetic Kitchen capture/review/item/share route behavior. Those routes now state what is unavailable and direct the owner to supported Account controls. Removed the root `DemoProvider`, `demo-store.tsx`, `demo-validation.ts`, and demo-only shared record interfaces; no route consumes `useDemo`. Settings and shell copy now describe service availability instead of a local demo.

## Verification

- `rg -n 'useDemo|DemoProvider|demo-store|demo-validation' frontend/src` returned no matches.
- `git diff --check` passed.
- Unit tests were not run or added. Type/lint/build could not be rerun because the isolated worktree dependencies are incomplete after the previously recorded junction/installation issue.

## Remaining boundaries

Manual fact, outcome, shopping, and private sharing commands remain in Account under existing version/idempotency controls and default-off configuration. Main destinations do not mount writes. Photo extraction and persisted review drafts remain unavailable. Live sign-in/API connectivity is unverified.

Architecture pointer: `docs/knowledge/ARCHITECTURE.md`.
