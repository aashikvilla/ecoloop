# Factual household activity summary — 17 October 2026

## Scope and authority

Implemented the bounded Activity summary on `codex/impact-ledger`, using the authenticated household `activity` and owner-private `share-logs` APIs. Read the project contract, household MVP specification, implementation plan, architecture/decision/past-mistake knowledge and the EcoLoop domain-engine skill. No environment files were read, no browser or Firestore writes were made, and no canonical mutation behavior changed.

## Changes

- Activity now summarizes owner-recorded Used, Stored, Handed over, Discarded and Composted outcomes from the loaded activity page.
- Amounts are added only for `MEASURED` records with the same exact unit string. `USER_ESTIMATED` and `UNKNOWN` amounts remain out of totals and are counted separately.
- Current `OFFERED` and `ACCEPTED` private share-log states are shown separately from completed, owner-reported handover outcomes. Cancelled/expired offers are also counted separately.
- The UI states that records are owner reported, do not verify consumption or recipient receipt, and do not measure waste prevented or environmental savings. It labels the summary as covering loaded records and points to more pages when cursors exist.
- Added a past-mistake pattern for page-scoped summaries and updated the architecture pointer.

## Verification

- `git diff --check` passed after the code change.
- Frontend lint/type checks were unavailable: this isolated worktree had no installed dependencies. `npm ci` from its own lockfile did not produce local tools before stalling and was interrupted; the primary checkout was not used or modified for dependency installation.
- No unit tests were run or added, in line with project policy.

## Limits

Each summary covers up to 100 records per endpoint page. The UI displays continuation notices when more records exist; it does not imply a lifetime household total. Exact unit strings are grouped as stored, with no unit conversion. These user-reported records do not establish food safety, actual consumption, recipient confirmation, waste prevention or environmental impact.

Architecture pointer: [ARCHITECTURE.md](../ARCHITECTURE.md). Current contract: [CURRENT_MVP_SPEC.md](../../planning/CURRENT_MVP_SPEC.md).
