# Live destination reads — 17 October 2026

## Scope

Moved Home, Kitchen, Ask, Shop, Activity, and Settings away from local demo reads. The four main destinations now require a signed-in user and explicit household selection; they show loading, empty, error, signed-out, and configuration states instead of substituting browser data. Home reads canonical Kitchen and the first Activity page. Kitchen and Shop use their existing GET endpoints. Activity uses the owner-private paginated API. Ask posts to the existing assistant-turn endpoint and validates the typed envelope; approval remains unavailable. Settings reports managed preference read/write/delete as unavailable. The account page retains existing reviewed controls. No new write UI was mounted.

Household scope is shared in tab memory across routes and clears on account changes/sign-out. Read results are keyed by user, household, and resource so a scope change cannot display the previous household's records while the next request loads.

## Evidence and limits

- TypeScript `--noEmit` passed before the final Settings/scope-key refinements.
- ESLint passed with no errors after removing the unused Kitchen import; the one warning was also removed before the final refinements.
- `git diff --check` passed.
- Production build was blocked because Turbopack rejected a cross-worktree `node_modules` junction. A later isolated lockfile installation did not complete in the bounded attempt, so no build result is claimed.
- No unit tests, live sign-in, API calls, or cloud changes were performed.

## Remaining integration gaps

Canonical capture and item detail/outcome flows are not mounted into Kitchen. Shop's destination remains read-only; existing reviewed account command controls are its write path when enabled. The assistant endpoint can report provider unavailable; proposal approval remains unavailable. Settings has no managed preference endpoints. Activity loads the first 100 entries and links to the account's paginated private-history control for more pages. Live identity, membership, and API connectivity remain unverified.

## Source pointers

- Current product contract: `docs/planning/CURRENT_MVP_SPEC.md`
- Architecture and service boundaries: `docs/knowledge/ARCHITECTURE.md`
- Current branch: `codex/live-backend-ui`
