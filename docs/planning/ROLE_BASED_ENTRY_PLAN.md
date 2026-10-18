# EcoLoop public entry and role-based routing plan

**Status:** Proposed for owner review · 18 October 2026
**Scope:** Public landing page, Personal/Organization sign-in choice, protected route boundaries, role-aware redirects, and an Organization placeholder only. This document is planning; it authorizes no application implementation.

## Recommendation

Use **Personal** and **Organization** as the two sign-in choices. On the landing page, clarify the second audience as **For food recovery organizations**. “Vendor” sounds like a seller and does not describe the recipient organizations that need organization access. The internal actor type is `recipient_org`.

Keep one Firebase identity and one supported sign-in flow. The choice selects the intended workspace; it does not create a separate credential system or grant a role. FastAPI membership and approval records remain authoritative. The backend already supports one Firebase UID having both household membership and organization membership, so no separate account system or schema change is needed for the dual-role case. A recipient organization still needs approved status before organization access is allowed. The supplied public-home and unified-login prototypes are the visual references, with existing product rules taking precedence over unsupported claims or integrations shown in prototype copy.

Firebase Auth already uses `browserSessionPersistence`, which preserves the signed-in identity across a page refresh in the same browser session. The current active household selection is only React state and is cleared when auth initializes, so users can remain signed in but lose their selected workspace on refresh. Restore the last workspace from `sessionStorage` after Firebase auth resolves, then validate it against the signed-in user's memberships before opening protected data. Clear the saved selection on logout. This keeps refresh continuity aligned with the current browser-session sign-in behavior.

## Proposed route shape

```text
frontend/src/app/
  layout.tsx                       # fonts, metadata, shared auth provider
  (public)/
    page.tsx                       # public EcoLoop introduction at /
    login/page.tsx                 # Personal / Organization selector at /login
  (protected)/
    layout.tsx                     # signed-in check; send signed-out users to /login
    (personal)/
      layout.tsx                   # household scope and current personal AppShell
      home/page.tsx                # household dashboard at /home
      kitchen/...                  # preserve current /kitchen URLs
      ask/...                      # preserve current /ask URL
      shop/...                     # preserve current /shop URL
      account/...                  # existing household selection and setup
      offers/...                   # existing household donor flow
      ...                          # remaining personal routes
    organization/
      layout.tsx                   # verified organization access; top header/logout, no tabs
      page.tsx                      # one placeholder at /organization
```

Next.js route groups do not add URL segments. The current `/` dashboard must move to `/home` to make `/` the public entry. Keep existing personal feature URLs where possible, and update all Home and logo links that currently point to `/` to point to `/home` when they are inside the signed-in personal experience. Public-page calls to action go to `/login?mode=personal` and `/login?mode=organization`.

## Sign-in and redirect behavior

1. The public landing page explains EcoLoop at a high level and presents two clear entry buttons. It has no household or organization navigation tabs.
2. `/login` opens with the requested mode from `mode`; users can switch Personal/Organization before signing in. Both modes use the Firebase providers already supported by the app. Preserve an optional validated `next` path for protected deep links.
3. The protected boundary checks Firebase auth. Signed-out users go to `/login` with their intended path preserved. A successful sign-in returns to the selected workspace after its membership check.
4. After Firebase auth resolves, restore the last workspace choice from `sessionStorage` and revalidate it using current membership reads. This preserves the signed-in session and the active destination through refresh without treating browser storage as authorization.
5. Personal access requires an active household membership and selected household scope. Existing members can continue to choose a household through the account connection flow; a new user without a household completes the existing setup path before reaching `/home`.
6. Organization access requires an active, approved `recipient_org` membership returned by the existing `/api/v1/organizations/me` endpoint. The organization route renders only its placeholder in this scope. Missing or unapproved membership is an explicit access state; the client never creates or assumes a role from the selected login tab.
7. One account may have both Personal and Organization memberships. The login mode routes to the requested workspace; each destination is independently checked against the matching membership. No extra account linking flow is required for this.
8. Add logout to the top header in each signed-in shell. It signs out through Firebase, clears saved and in-memory household/organization scope and private page state, then returns to `/`. Do not show signed-in navigation on public routes.

## Bounded implementation sequence

1. Reconcile route moves and links: inventory `href="/"`, logo links, route-level metadata, and the current global `AppShell` before moving the household Home page to `/home`.
2. Split the global layout responsibilities: keep the root layout provider-only; add a public shell and place the existing personal navigation in the protected Personal layout.
3. Add the public landing page and unified login selector using the supplied prototype structure and existing semantic UI tokens. Keep all claims factual and supported by the current product contract.
4. Add shared auth redirect handling and role membership checks, using Firebase identity plus the existing household and organization membership APIs. Preserve explicit loading, unavailable, denied, and error states.
5. Add the Organization route's single placeholder and top-header logout. No other Organization pages, navigation menus, or workflows are included in this plan.
6. Review route access, direct-link redirects, logout cleanup, responsive layout at 360px, keyboard/focus access, and links that changed from `/` to `/home`. For a later implementation request, verify with the checks the owner requests; do not add or run unit tests.

## Risks and decisions to resolve during implementation

- **Root route migration:** bookmarks to `/` will open the public landing page; signed-in personal navigation must use `/home` consistently.
- **Workspace ambiguity:** a user may have both household and organization memberships. The login mode should determine the requested workspace, while the server-verified membership determines access. Keep the last workspace in session-scoped storage only as a restore hint, never as proof of membership.
- **Organization status:** only approved recipient organizations can enter the organization area. Keep pending, missing, and unavailable states distinguishable without implying approval.
- **Prototype fidelity:** use the warm, simple presentation, but do not copy unsupported claims, fabricated metrics, or sign-in providers absent from the current Firebase setup.

## References

- [Current MVP specification](CURRENT_MVP_SPEC.md)
- [Implementation plan](IMPLEMENTATION_PLAN.md)
- [Architecture knowledge](../knowledge/ARCHITECTURE.md)
- [Social impact Phase 1 implementation record](../implementation/social-impact-phase1.md)
- [Public homepage prototype](../prototypes/ecoloop_public_homepage/)
- [Unified login prototype](../prototypes/ecoloop_unified_login_personal_organization/)
