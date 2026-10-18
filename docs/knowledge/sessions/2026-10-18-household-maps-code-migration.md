# Household and Maps code migration — 18 Oct 2026

## Scope

Migrated relevant consumer-side code from `sudikhya/ecoloop` `main` onto `feature/public-entry-role-routing`. The user explicitly asked to leave deployment workflow changes out and retain the current shared login for Personal and Organization.

## Migrated changes

- Household deletion endpoint and owner-only UI action.
- Maps address autocomplete and household location capture, including Maps key sample configuration and frontend layering/readiness fixes.
- Household selection reconciliation after creation and refresh of displayed household details.
- Bounded backend availability diagnostics.

The Maps styling/configuration change came from a mixed upstream commit; only `.env.example` and frontend component/style files were migrated. No deployment workflow, Dockerfile, Cloud Build configuration or deployment gate notes were cherry-picked. The Organization login choice and placeholder remain unchanged; no Organization offer/map/collection features were added.

## Integration

The incoming household selection UI conflicted with local route-return behavior in `frontend/src/components/account/account-connection.tsx`. The merge preserves owner-only deletion controls and current selection/status UI, and returns to a validated `next` Personal route after a household membership is selected. The shared Personal/Organization login remains the entry point.

## Verification

- Frontend `npm run lint` — passed.
- Frontend `npx next typegen` — passed.
- Frontend `npx tsc --noEmit` — passed after correcting invalid selection to return `false`.
- Frontend `npm run build` — passed; Next generated all 24 pages.
- Backend `.venv/Scripts/python.exe -m compileall -q app` — passed.
- Browser smoke check on the production build — public home rendered; Organization login choice selected; `/organization` redirected signed-out users to Organization login with `next`; `/home` redirected signed-out users to Personal login with `next`.
- `git diff --check` — passed.

No unit tests were added or run because the project AGENTS instructions prohibit frontend/backend unit tests. Authenticated household deletion and Maps selection were not exercised with a real account or configured Maps key.

## Migration boundary

Deployment workflow commits (`6bf7315`, `bbc3711`, `00c3f9a`) were not migrated. Commit `3b9941d` was applied selectively to keep deployment changes out. Other documentation-only deployment gate updates were omitted. The local branch’s existing route/login work and untracked prototype files were restored and preserved.
