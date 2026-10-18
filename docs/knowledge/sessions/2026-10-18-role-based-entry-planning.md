# Public entry and role-based routing plan — 18 October 2026

## Scope

Owner requested planning only for a public EcoLoop landing page, a Personal/Organization sign-in choice, role-appropriate redirects, and logout in the signed-in header. No application code was changed. Organization scope is limited to one placeholder route; no other organization pages, menus, or workflows are planned here.

## Findings

- The current root route `/` is the authenticated household Home dashboard. The global `AppShell` currently wraps every route and renders household navigation even before a role-specific shell exists.
- Firebase auth is already shared through `LiveHouseholdProvider`; the account connection page contains supported email/password and Google sign-in plus household membership selection and sign-out.
- `frontend/src/lib/firebase-client.ts` explicitly configures `browserSessionPersistence`, which retains sign-in across a refresh in the current browser session. `LiveHouseholdProvider` resets its active household ID on auth initialization, and there is no session/local storage restore for that scope, so the selected household is lost across refresh even when identity remains signed in.
- The backend stores household membership under each household and organization membership under `organization_members`; the same Firebase UID can therefore hold both. `GET /api/v1/organizations/me` lists the caller's active organization memberships. Recipient organization actor access still requires `verification_status == APPROVED`; creating a recipient organization currently produces `PENDING` status.
- `GET /api/v1/organizations/me` and frontend `fetchMyOrganizations` already exist. The backend distinguishes `business_donor` from `recipient_org`, and recipient access depends on server-side approval/membership checks.
- The public homepage and unified login prototypes are supplied under `docs/prototypes/`. Prototype copy includes product claims/providers that are not all supported by the current product contract; use only the layout direction and factual, approved messaging.
- The active tree has untracked prototype assets and `docs/planning/stitch_ecoloop_mobile_pwa.zip`; they were left untouched.

## Recommendation and record

Recommend the visible choices **Personal** and **Organization**, with **For food recovery organizations** as supporting copy. Keep one Firebase identity and treat the selected mode only as workspace intent; verify the actual membership server-side. The backend already permits both membership types on one account, subject to organization approval. Keep the existing session-persistent Firebase auth behavior and restore the last workspace selection from session storage after revalidating membership; this closes the refresh experience gap without changing sign-in persistence. The household Home route should move from `/` to `/home`, while existing personal feature URLs remain stable inside a protected route group. Each signed-in shell gets a top-header logout action. The organization route gets a single placeholder without navigation tabs.

The detailed proposed route tree, redirects, sequence, and risks are in [ROLE_BASED_ENTRY_PLAN.md](../../planning/ROLE_BASED_ENTRY_PLAN.md). This is a proposal, not an accepted architecture decision; no entry was added to `knowledge/DECISIONS.md` pending owner review.

## Current pointers

- [Architecture](../ARCHITECTURE.md)
- [Decisions](../DECISIONS.md)
- [Past mistakes](../PAST_MISTAKES.md)
- [Current MVP specification](../../planning/CURRENT_MVP_SPEC.md)
