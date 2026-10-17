# Confirmed Kitchen observation correction — 17 October 2026

## Implemented

- `f29fd50` updates `FoodObservationInput` so a known zero amount remains representable and unknown dates cannot carry a `date_source`. Other positive-only command amounts remain unchanged.
- `4244a0c` adds a correction form to the authenticated Kitchen item detail. The owner reviews the full candidate command before confirm; stable item ID, current version, unknown values and user-entered date provenance are preserved. Existing API membership/version/idempotency guards remain authoritative.
- `da19e9a` fixes the integration lint/type findings by initializing edit drafts on explicit user action and removing impossible UI state comparisons.

## Review and checks

- Independent critical review of `POST /api/v1/facts/confirm` confirmed the transaction rechecks membership, compares `base_version`, and binds idempotent replay to actor plus payload. It found the zero and date-provenance gaps; the schema fix addressed both.
- Independent critical review of the UI branch found no actionable scope, retry, conflict, accessibility or copy issue.
- The first root ESLint/TypeScript pass found one React effect rule violation and seven impossible phase comparisons. After correction, frontend ESLint, TypeScript (`tsc --noEmit`) and `git diff --check` passed.
- No unit tests, build, browser writes, live Firestore mutation, provider call, cloud change or environment-file read occurred. The existing write flag remains false by default.

## Acceptance limits

This records code preparation and static checks only. The editor has not been exercised with a signed-in browser against Firestore, including zero correction, stale-version conflict, exact retry after an ambiguous successful response, or concurrent writes. M2.02.01 remains incomplete because those acceptance cases and prerequisite M2.01.03/phase evidence remain open. `main` is unchanged and PR #1 remains a draft.

The parallel photo gate review found Storage rules deny all objects and no private upload/finalize route or retention lifecycle exists. Do not enable a photo picker or claim extraction acceptance until those controls and owner-reviewed cloud setup are ready.
