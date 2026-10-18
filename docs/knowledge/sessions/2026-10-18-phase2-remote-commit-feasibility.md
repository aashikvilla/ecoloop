# Remote main commit migration feasibility — 18 Oct 2026

## Request

Assess whether commits from `https://github.com/sudikhya/ecoloop` `main` can be migrated to the local `feature/public-entry-role-routing` branch. This is a read-only feasibility pass; no cherry-picks were applied to the user's branch.

## Findings

- Local `HEAD` is `21b0e93` (`feat: add offers management feature for donors`). The histories share base `1217c5a`; the local branch contains `24311f2` (phase-zero foundation) and `21b0e93` after that base, while remote `main` currently resolves to `214840f`.
- Remote main has 12 non-merge commits after the shared base plus one merge commit. The non-merge commits were replayed in order on a disposable worktree based on local `HEAD`; all applied without cherry-pick conflicts.
- The remote changes cover household deletion, Maps autocomplete and household location, household-selection fixes, availability diagnostics, and a personal Cloud Run deployment workflow. They do not implement Organization offer discovery, accepting/collecting offers, organization maps, or multi-order routing.
- A three-way dry application of current tracked branch changes onto the replayed tree found one overlap conflict in `frontend/src/components/account/account-connection.tsx`; the other tracked changes applied cleanly. Untracked role-routing files were not included in this patch check, so they require review during implementation.
- The remote deployment workflow targets project `ecoloop-511918`, whereas this project’s recorded deployment environment is `ecoloop-staging-20261015`. It deploys on pushes to `main` and sets `AGENT_ENABLED=true`; those are material environment and release-policy differences. Do not migrate that workflow unchanged.
- The remote source contains frontend/backend code and CI configuration but no organization collector implementation in the changed path set. The user’s existing branch worktree was preserved; the disposable worktree and patch were removed.

## Recommendation

Migration is feasible, but use a selective migration plan instead of cherry-picking the full remote history. First decide whether household deletion and Maps/autocomplete onboarding are in scope for this phase. If yes, port those feature commits onto the current branch, resolving `account-connection.tsx` against the role-routing changes and reviewing household deletion semantics. Keep the deployment commits out until their project, environment, secrets and trigger are reconciled with the current deployment decision. Treat the remaining household UX fixes and diagnostics as dependent follow-ups, then run the project-approved verification flow.

## Evidence boundary

No application checks or tests were run for this read-only assessment. The replay was a commit application check, not functional verification. No user branch commit or source file was cherry-picked or merged.
