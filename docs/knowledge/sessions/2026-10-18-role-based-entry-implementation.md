# Public entry and role-based routing implementation — 18 Oct 2026

## Scope

Implemented the authorized frontend entry update on branch `feature/public-entry-role-routing`, using the supplied `docs/prototypes/home` designs. The scope covers a public home, a Personal/Organization login selector, protected route families, persistent session workspace restoration, top-header logout and one organization placeholder. No organization offer, pickup, map or route-planning screens were implemented.

## Decisions

- Keep one Firebase identity. The login choice sets the destination workspace, and backend membership checks decide access.
- Preserve existing personal URLs while moving their pages into a protected route group. The personal dashboard now lives at `/home`.
- Use UID-scoped session storage to restore the selected household after refresh, then revalidate it against current memberships.
- Organization pages render only a membership-aware placeholder.

## Changes

The root layout now hosts shared providers only. Public pages have a lightweight public shell. Protected routes use a shared identity guard and role-specific layouts. Personal routes retain the existing household shell and include logout in its header; the organization shell has a header with logout and no feature navigation. Login preserves a safe internal `next` path and selects the relevant workspace mode.

## Verification

- `npm run lint` — passed.
- `npx next typegen` — passed.
- `npx tsc --noEmit` — passed after removing one confirmed stale generated `.next/dev/types/validator.ts` file left by route moves.
- `npm run build` — passed; Next generated 24 static pages and listed the public, personal and organization routes.
- `git diff --check` — clean after trimming an extra trailing blank line.
- Browser on the local production server — `/` rendered the public home; `/login?mode=organization` selected Organization; opening `/home` while signed out redirected to `/login?mode=personal&next=%2Fhome`; opening `/organization` while signed out redirected to `/login?mode=organization&next=%2Forganization`.

Project instructions prohibit adding or running unit tests. No real account was used, so a signed-in membership flow, logout click and refresh with a live Firebase session were not manually exercised. Existing Firebase client configuration uses `browserSessionPersistence`, which survives page refresh for the same browser session; selected household restoration is UID-scoped and membership revalidated. The backend supports a single Firebase UID with both household and organization memberships, and organization access is constrained by approved membership.

## Follow-up

Manual authenticated acceptance remains: test both workspace destinations, verify organization placeholder states against the configured API, verify logout from each header, and refresh with an active identity to confirm the intended session behavior. Organization product screens remain out of scope.
