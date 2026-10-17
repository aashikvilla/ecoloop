# Saved plan outcome follow-up — 17 October 2026

## Change

Home now provides an obvious follow-up from saved plans. Ingredients linked to a Kitchen record open that item's existing explicit outcome review with the plan reference preserved. Plans without linked items open the same review flow with a current Kitchen item selector. The form states that a saved plan does not establish preparation or consumption and requires the user to choose and confirm an observed outcome.

The outcome command now accepts nullable `plan_id`. The API resolves the plan only beneath the authenticated household and validates its identity and stored version in the existing Firestore transaction before writing the outcome. The stored outcome includes the reference, and the idempotency payload fingerprint includes it. The owner-private Activity API and history UI retain and display the reference. Existing membership, actor-bound idempotency and Kitchen item version checks still apply. No plan action changes Kitchen stock.

## Verification

- TypeScript: `tsc --noEmit -p tsconfig.json` passed for the outcome-reference and Home flow. A rerun after adding Activity history display did not complete in the isolated environment.
- ESLint: all changed frontend files passed using the existing ESLint config/toolchain; React auto-detection warned because the isolated dependency install was incomplete.
- Backend: `python -m compileall -q app` passed using the available project virtual environment against the isolated worktree source.
- `git diff --check` passed.
- Installing dependencies in the isolated checkout with `npm ci` did not complete, so checks used the existing checkout's toolchain by absolute path; no junction or dependency link was created.
- No unit tests, live API call, browser journey, Firebase access, deployment or external write was run.

## Remaining acceptance

Exercise a signed-in household end to end: follow a saved plan to a linked item, review and record an observed outcome, verify the plan ID in canonical outcome/activity data, and confirm item version/idempotent retry behavior. Also verify the fallback item selector for a plan with no linked Kitchen ingredients. This slice does not complete M4.02.02 or M4 exit review.
