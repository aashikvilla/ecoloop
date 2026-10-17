# Remove local demo routes — 17 October 2026

## Changes

Removed the remaining synthetic Kitchen capture/review/item/share route behavior. Those routes now state what is unavailable and direct the owner to supported Account controls. Removed the root `DemoProvider`, `demo-store.tsx`, `demo-validation.ts`, and demo-only shared record interfaces; no route consumes `useDemo`. Settings and shell copy now describe service availability instead of a local demo.

## Verification

- `rg -n 'useDemo|DemoProvider|demo-store|demo-validation' frontend/src` returned no matches.
- `git diff --check` passed.
- Unit tests were not run or added. Type/lint/build could not be rerun because the isolated worktree dependencies are incomplete after the previously recorded junction/installation issue.

## Remaining boundaries

Manual fact confirmation and shopping commands remain in Account under existing version/idempotency controls and default-off configuration. Outcome and private sharing controls are not mounted. Main destinations do not mount writes. Photo extraction and persisted review drafts remain unavailable. Live sign-in/API connectivity is unverified.

Architecture pointer: `docs/knowledge/ARCHITECTURE.md`.

## Final Ask and shell copy follow-up

The Ask loading label now describes the household assistant. Validated proposal cards returned by the assistant API render their typed content; scripted card examples were removed. Provider-unavailable responses remain explicit, and unsupported meal-plan, outcome, sharing, and preference actions are identified as unavailable. AppShell route labels now use household or unavailable status, and Account/settings copy no longer claims a local demo, outcome, or private-sharing controls are present.

`git diff --check` passed. Type/lint/build remain unavailable in this worktree because dependencies are missing; no unit tests were run or added.
