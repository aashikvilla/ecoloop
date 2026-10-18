# Organization pickup Phase 2 local implementation — 18 October 2026

## Owner request and scope

The owner authorized implementation of the simplified organization/NGO pickup flow on a new feature branch and explicitly requested GPT-6 Luna High subagents. The agreed scope is one operator per organization login, self-completed profile, nearby list/map discovery, basic search/filter, saved multi-offer selection and quantity coverage, simple reservations, route, collected and received quantities, and matching donor/recipient receipt impact. No organization approval workflow, team roles, assigned collector, AI dependency, deployment, or live task-sheet edit was authorized.

## Work completed

- Implemented on `feature/organization-pickup`.
- Backend contracts, recipient profile completion/access, nearby bounded discovery, saved/versioned recovery plans, plan-stop reservations, claim cancellation, collected and received outcomes, receipt adjustments, donor handover record, recipient/donor impact reads, and optional Google Routes adapter/endpoints.
- Frontend organization workspace replaces the placeholder. It supports profile creation/editing; map/list discovery with basic filters and capped-result messaging; editable multi-stop plans; quantity/portion coverage; per-stop reserve, cancel, collect and receive; routes and return directions; and confirmed received quantities. Existing Places autocomplete is reused. Approximate map markers do not reveal donor exact addresses.
- Donor offer detail and offer lists display recipient-confirmed quantities by unit, preserve household/business actor context, and label page coverage. Existing donor pages received the recipient eligibility copy update.
- Changed identity integration and legacy social-impact guard points, registered API routers, added geohash/claim/plan/impact Firestore indexes, and added an optional server-side Routes key in the safe `.env.example` template.
- Retired standalone legacy claim creation with HTTP 410. New reservations must be plan-linked so collection/receipt can continue against the same ledger. Discovery now replaces donor-entered approximate-area text with a neutral label to prevent accidental exact-address disclosure.
- Delegated profile/discovery, claims/receipt, and organization UI lanes to GPT-6 Luna High subagents; an independent static reviewer identified the two lifecycle/privacy issues above. No unit tests were run or added.

## Verification

- Backend `compileall -q app`: passed.
- FastAPI import/OpenAPI generation: passed; 52 paths generated and the seven key recipient paths were present.
- Recipient-domain import smoke: passed, including claim endpoint/domain, discovery, plan update and handover imports.
- `firestore.indexes.json` parse: passed.
- Frontend `pnpm lint`: passed with no output beyond command banner.
- Frontend `pnpm exec tsc --noEmit`: passed.
- `git diff --check`: passed (Git emitted only line-ending normalization warnings).
- No cloud or Firebase emulator transaction checks, live index query, authenticated browser journey, external Routes call, build, unit tests, deployment or external write were performed. A configured Google Routes key is optional and unverified; the app reports route-timing unavailability and retains directions fallbacks.

## Limits and follow-up

Local static checks do not prove Firestore transaction semantics, deployed indexes, real provider behavior, or full journey UX. Existing legacy standalone claim records, if any, are not migrated into plans; inspect/reconcile them before release because the retired endpoint prevents new ones but cannot make old unlinked claims routable. Run the synthetic end-to-end failure/receipt/privacy matrix in the implementation plan before release. Keep deployment acceptance separate and pair it with the donor-side release. The live MVPTasks Sheet remains the status authority and was not changed.

## Knowledge pointers

- Scope, task breakdown and acceptance matrix: [Organization pickup implementation plan](../../planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md)
- Current household/product contract: [current MVP spec](../../planning/CURRENT_MVP_SPEC.md)
- Shared boundaries: [architecture](../ARCHITECTURE.md)
- Owner choice: [decision](../DECISIONS.md#simplified-recipient-pickup-scope--2026-10-18)
- Lesson from review: [past mistakes](../PAST_MISTAKES.md#2026-10-18--retire-old-mutation-paths-when-introducing-a-new-ledger-lifecycle)
