# Organization pickup — implementation plan

18 October 2026 · Gear: SCOPE HOLD · Branch: `feature/organization-pickup`

Status: local implementation complete; acceptance and deployment remain open. This plan records the owner's simplified Phase 2 scope. Task IDs below remain a proposed execution breakdown, not live MVPTasks status. The live Sheet was not changed. Implementation evidence is recorded in [the 18 October implementation session](../knowledge/sessions/2026-10-18-organization-pickup-implementation.md).

## 1. Outcome and scope authority

An organization user completes a profile, finds nearby food, combines several offers into one collection, reserves them, gets a route, records collection, and confirms receipt. Donors see the same recipient-confirmed quantities. One organization operator does the whole journey through the existing Firebase login.

The owner's 18 October instructions supersede the older Phase 2 requirements for manual approval, coordinator/collector roles, assigned collectors, and mandatory three-party handover. This plan is the current implementation authority for this recipient feature. The household contract and donor business policy continue to govern their own scopes. Implementation, provider usage and deployment are separate execution steps; this planning session changes documentation only.

| Include in the first implementation | Defer |
|---|---|
| Profile completion grants recipient access immediately | Admin approval, NGO verification workflow, team invitations and roles |
| One organization operator; existing identity and membership checks | Separate collector accounts, assignments, fleet or vehicle-capacity management |
| Nearby list and map, basic filters, manual location fallback | Advanced dietary matching, broad recommendations or a new chat platform |
| Persistent multi-offer selection, quantities and coverage | Automatic dispatch, autonomous claims or purchases |
| Simple Reserve selected action with clear results | Distributed rollback, multi-offer atomic transaction, reservation negotiation |
| Google route through reserved stops, returning to the base | Live tracking, embedded turn-by-turn navigation, guaranteed optimal scheduling |
| Mark collected, then confirm received, including short/zero receipt | Formal dispute case management, evidence uploads and approval chains |
| Recipient-confirmed quantities on donor and NGO views | Composite eco scores, assumed carbon/water/money savings, people-fed claims |
| Optional bounded AI request parsing after the core flow works | Making discovery, grouping or pickup dependent on AI availability |

Use one organization's existing sign-in session throughout. No team management or credential-sharing feature is needed. Active server-owned membership remains the authority even when the UI presents only one operator.

## 2. Existing foundation and actual gaps

| Current source | Reuse | Change needed |
|---|---|---|
| `backend/app/core/identity.py` | Firebase token and current actor membership | Recipient eligibility based on complete profile rather than manual approval |
| `backend/app/domain/social_impact.py` | Organization creation, offer ownership, private views and atomic per-offer claims | Thin integration points for new focused domains; avoid extending the already large file |
| `backend/app/schemas/social_impact.py` | Canonical quantity units, claim/event/impact primitives | New recipient, discovery, collection and route contracts in focused modules |
| `frontend/src/app/(protected)/organization/` | Protected workspace entry | Profile, discovery, collections and impact routes |
| `frontend/src/components/organization/organization-placeholder.tsx` | Current membership loading/error patterns | Replace placeholder with functional workspace |
| `frontend/src/components/account/location-autocomplete.tsx` | Existing Places autocomplete and manual fallback | Share its loader with map components; it does not provide routing today |
| `frontend/src/lib/canonical-offers.ts` | Donor contract context | Focused recipient adapter with validation, cancellation and stable retry keys |

Discovery currently returns the latest 50 `OPEN` offers globally. It has no nearby query, expiry filtering or map coordinates. It also omits available `PARTIALLY_RESERVED` offers. Filtering those 50 in the browser cannot establish that no food exists nearby.

Current claims are keyed by offer and organization; a cancelled claim blocks another reservation for that pair. Current donor cancellation can close an offer with reservations without reconciling its claims. Current private detail depends on offer publication status, which can hide pickup/history after closure. These seams must be addressed in the tasks below.

The documented G0 foundation is complete. G1 donor changes are local with deployed/business acceptance still open. Coding this feature may proceed against the current branch, while a deployed end-to-end claim must wait for the matching donor and recipient release. Existing old G0 pending-organization denial expectations must be updated for the owner's revised access policy; unrelated membership/privacy protections remain required.

## 3. Small user journey and pages

1. Sign in with Organization selected. If no recipient profile exists, open Complete your organization profile.
2. Enter organization name, category, pickup base and default search radius. Choose the base with the existing address widget, GPS after a tap, or explicit manual coordinates. Confirm and save; enter discovery immediately.
3. Find food defaults to the base and a 5 km radius. List is the mobile default, with a Map toggle. Search by title/category, change radius, and optionally filter pickup availability. Cards show available amount, approximate area/distance, pickup window and existing donor declarations/unknowns.
4. Select offers, choose the quantity wanted from each, then Review collection. Limit the initial collection to five offers. Remove or change selections; selection alone never reserves food.
5. Save the collection with the base as destination and an automatic, editable name. Optionally enter the desired portion count. Show selected amounts grouped by unit and any comparable shortage. Persist the draft so refresh restores it.
6. Tap Reserve selected. Each stop shows Reserved or Unavailable with a simple reason. Keep successful reservations and let the user remove failed stops or try another offer. Show a remaining desired quantity where it can be calculated.
7. Generate collection route for the reserved stops. Show numbered stops, provider travel estimates, pickup deadlines and a return to the base. Open directions for the next stop in Google Maps. Exact addresses and route geometry are available only for the organization's successful active claims.
8. At a stop, Mark collected opens a quantity confirmation prefilled from the reservation. The same operator can lower it or record Nothing collected. Persist once and advance to the next stop.
9. At the base, Confirm received shows collected amounts for each stop. Confirm all unchanged amounts in one review, or edit shortages/zero amounts. Each receipt posts a stable idempotent command and reports its result; the group summary never hides an unconfirmed row.
10. Completion shows what was received. The donor's offer detail and impact summary read the same receipt events. Reload or sign back in to resume the collection/history.

Proposed routes:

| URL | Purpose |
|---|---|
| `/organization` | Find food: list/map, search, basic filters and selection |
| `/organization/profile` | Create/edit the profile and base/radius |
| `/organization/collections` | Active and completed collections |
| `/organization/collections/[id]` | Review, reserve, route, collection and receipt stages |
| `/organization/impact` | Receipt-confirmed totals by unit and collection history |

Navigation: Find food, Collections, Impact. Profile and logout remain header actions. Use the existing warm theme and shared UI/layout primitives. At 360 px use one column and a sticky Review N offers button, labelled quantity controls, at least 44 px targets, focus states, and input-preserving error messages. No new prototype generation is needed to start this bounded work.

## 4. Contract choices to freeze before parallel coding

### Profile completion and access

- Add `profile_status: INCOMPLETE | COMPLETE` and `service_radius_km` to recipient profiles. Required completion fields: name, category, confirmed pickup-base coordinates/area and radius. Proposed bounds: radius 1–20 km, default 5 km.
- Keep identity-verification state distinct from profile completion. Do not set `verification_status=APPROVED` merely because the owner completed a form. Existing `PENDING` verification is not an operational blocker after completion; UI says Profile complete, without a pending-review screen or verified-NGO badge.
- Centralize recipient eligibility: correct organization type, complete profile, active current membership, organization not revoked. Use the same rule in the actor dependency, domain read guard and transaction guard. Business donor approval policy remains separate.
- Create the initial operator membership on the server. Existing pending profiles become usable after their owner explicitly completes/saves them; no bulk auto-approval. Legacy approved profiles remain usable if their required profile fields are valid. Revoked records stay denied.
- Profile bootstrap/read/update uses verified UID plus ownership/membership and is accessible before operational eligibility, so incomplete users cannot get stuck behind the actor gate. New organization selection is UID-scoped, restored and revalidated after refresh; logout/scope changes clear private state and cancel old requests.

### Nearby search and map privacy

- Extend search to `OPEN` and `PARTIALLY_RESERVED` offers with positive available amounts. Check pickup end and known expiry on the server; recheck at reservation/collection.
- Use geohash ranges/indexes plus server distance filtering, deduplication and stable bounded pagination. Return a continuation/incomplete indicator when a search cap is reached; no false Nothing nearby conclusion. Do not filter only a global latest-50 page.
- Maintain a geohash from donor-confirmed coordinates on publication/edit. Existing eligible offers need an explicit bounded backfill or compatibility pass, with dry-run counts before any real migration.
- Return a coarse area marker with approximate-distance labelling. Do not send exact coordinates, address, instructions, donor UID or private media before a claim. Keep food declarations visible even when no advanced filter is offered; unknown is not allergen-free or vegetarian.
- Initial filters: query text, category, radius, pickup-available-now/today. Display existing dietary tags as donor-declared facts; add a dietary filter only for tags actually present in the canonical contract.

### Groups, quantities and simple reservation

- Store `recovery_plans` with organization/creator, name, need if supplied, origin/base snapshot, selected offer IDs and requested amounts/units, observed offer versions, linked claim IDs, version and timestamps. Cap at five unique offers.
- Use the collection's saved base as its route destination even if the organization profile later changes. Changing an existing collection's destination is an explicit versioned edit that invalidates its route.
- Derive group progress from stop/claim states rather than storing conflicting copies. Draft edits have no inventory effect. After reservation, a stop can be removed only through explicit claim cancellation; a new offer is a separately confirmed selection/reservation.
- Keep `people_requested` separate from `target_portions`. If the operator wants people coverage, ask explicitly for portions per person. Example: 6 declared portions + 4 declared portions = 10 portions; this matches a 10-portion target, not proof that 10 people ate. Packages, items, grams and millilitres remain separate totals.
- One Reserve selected action calls the existing per-offer transaction with stable keys. Recheck current eligibility, timestamps, unit, version and balance. Bound concurrency or process sequentially; preserve and show every successful claim when another fails.
- Retry an uncertain result with the same command key; never generate a new reservation because a response timed out. A plan/stop operation record must support resuming after refresh. Existing one-claim-per-offer/org identity remains in this version: cancelled offers cannot be reserved again by that org; show this constraint and let the user choose another offer. Re-reservation/top-ups are deferred.
- Pass the plan and stop IDs with reservation and atomically link the new claim to that owned plan stop in the same transaction. A claim belongs to one collection; selecting it elsewhere shows its existing collection instead of duplicating it. A lost response must reconcile through this saved link and command key, never leave a successful reservation orphaned.

### Collection, receipt and stock ledger

- Core claim path is `RESERVED → COLLECTED → RECEIVED`. No assigned collector or mandatory pickup-in-progress stage. Pre-collection cancellation/expiry is terminal. Zero collected closes the claim as `CANCELLED` with reason `NOTHING_COLLECTED`, releasing its reservation once; zero receipt completes `RECEIVED` with no positive receipt credit.
- Append actor/time/quantity events for each change. Organization lifecycle commands require current organization membership; optional donor handover requires ownership and current membership of the offer's household/business actor. Commands use expected claim version and an actor/payload-bound idempotency key. One operator may perform all organization actions.
- Enforce `0 <= received <= collected <= reserved_quantity` in the exact offer unit. Collection moves quantity from reserved to collected; receipt is a subset of collected and must not be subtracted a second time.
- Release an uncollected remainder on short collection or cancellation only if the donor offer is still eligible. Otherwise record it as unavailable with a reason, never silently reopen expired/cancelled food. The ledger gap is unavailable quantity, not a measured discarded-food amount.
- Recompute offer status from the current balances/time after collection, release and expiry: do not leave an offer `FULLY_RESERVED` when no reservations remain. Partial remaining availability stays discoverable; zero availability with no active reservations closes the offer, while elapsed deadlines expire it.
- Set the claim deadline from pickup end and known expiry. Check it on collect/reserve. Explicit plan refresh reconciles expired uncollected claims in bounded transactions and appends expiry events; a background scheduler is not needed for this first version. Discovery always applies time checks even before reconciliation.
- First-version rule: record collection before its deadline; receipt may be recorded afterward when collection was recorded in time. Backdated collection reporting requires a separate observed-time contract and is deferred. Receipt does not certify safety. A wrong received amount can be corrected through an explicit receipt adjustment with append-only reversal/replacement, expected version and matching donor/recipient totals.
- While claims are active, donor cancellation must not strand them: the minimal first version rejects donor cancellation and explains that existing reservations remain. Do not add a bulk cancellation/notification service. Claimed pickup/history reads must continue to work when the public offer closes.
- Donor handover is a separate optional donor confirmation, not a prerequisite for organization collection. Bound its amount to the claim quantity; it records a donor observation without another stock decrement. If absent, show Handover not confirmed; never fabricate it from the recipient's button.

### Routes and navigation

- Group selection uses coarse locations. Exact routing happens after reservation, from the chosen start (saved base by default or explicit current location), through active owned claims, back to the collection's saved base. Driving only for the first version; at most five offer stops.
- Backend resolves claim IDs to canonical stop coordinates; do not accept arbitrary model/caller-supplied donor coordinates or destinations. Recheck membership, claim state and pickup details before returning/reusing a route. Do not include an unreserved failed stop.
- Use server-side Google Routes `computeRoutes`, optimized waypoint order, a minimal response field mask and bounded request timeout. Google returns the stop permutation; the app maps it back to claim IDs. Label it Suggested collection route rather than a guaranteed best route. [Provider order documentation](https://developers.google.com/maps/documentation/routes/opt-way).
- Validate the suggested schedule against pickup windows locally using returned travel durations and an explicit configurable stop-time allowance. Mark that allowance as an estimate. If windows are infeasible, warn and offer removal/recalculation; a travel-efficient order is not proof that every pickup deadline is achievable. No fleet/time-window solver is in scope.
- Return provider, generated time, leg/total travel estimates and warnings. Keep raw provider geometry transient; persist the selected stops/versions and recompute after refresh when needed. Recheck Google content retention/display terms before adding any durable cache. Never imply live tracking.
- On Maps failure, preserve the collection and show Route unavailable. Allow next-stop navigation/manual instructions without displaying invented travel time or pretending an optimized route exists. Navigate one stop at a time to avoid relying on different mobile multi-waypoint URL limits. [Maps URL guide](https://developers.google.com/maps/documentation/urls/get-started).
- Reuse one shared browser Maps loader extracted from the existing Places widget. Browser map/Places key and server Routes credentials stay separate and appropriately restricted; no server credential in a public bundle. Confirm actual Maps access/quota/cost controls during authorized integration, not from the existence of a Places key.

### Impact visible to both accounts

- A positive receipt atomically records one deterministic receipt/impact event and updates the offer's received amount. Read donor and organization views from that same ledger; do not maintain independent increment-only counters on each dashboard.
- Show offered, donor-confirmed handed over if present, organization-reported collected, and recipient-confirmed received as distinct stages. Label source and scope. Receipt is confirmed by the recipient operator, not independently audited verification.
- Sum compatible units only; `g` may display as kg deterministically. Show completed collections and actual receipt-confirmed quantities. Identify whether totals cover a specified period/all matching records or only loaded pages; never present page totals as lifetime impact.
- Examples of value: Your offer reached an organization: 4 portions confirmed received; Organization collected 6 portions and confirmed 5 received. Do not equate a portion, claim or collection with a person fed or a complete meal served.

## 5. Proposed API surface

All paths remain under `/api/v1`; preserve `ApiResult`, strict validation and existing errors. Writes use stable `Idempotency-Key` and versions. Paths below are planned contracts, not implemented endpoints.

| Method/path | Responsibility |
|---|---|
| Existing `POST /organizations`, `GET /organizations/me` | Create/list profiles and membership; expose profile completion independently of verification |
| `GET/PATCH /organizations/{id}` | Own profile read/complete/update, available during onboarding |
| Existing `GET /offers` with bounded filters/cursor | Nearby sanitized discovery |
| `POST/GET /recovery/plans`; `GET/PATCH /recovery/plans/{id}` | Save/list/read/edit an organization-owned collection |
| `POST /recovery/plans/{id}/refresh` | Explicit bounded reconciliation/current stop status without creating new claims |
| Existing `POST /offers/{id}/claims` with plan/stop linkage | Atomic reservation reused by Reserve selected; preserve compatibility for earlier standalone claim clients |
| `GET /claims/mine`; `GET /claims/{id}` | Authorized pickup and history, including closed public offers |
| `POST /claims/{id}/cancel`, `/collect`, `/receive`, `/receipt-adjustments` | Simple lifecycle and traceable corrections |
| `POST /claims/{id}/handover` | Optional donor observation on its own offer; no additional ledger decrement |
| `POST /recovery/routes` | Route for active owned claims from selected origin to organization base |
| `GET /impact/me` | Actor-scoped receipt ledger, period/unit totals and source-labelled history |
| Optional `POST /recovery/search` | Bounded natural-language need extraction using the same deterministic search |

## 6. Tasks and acceptance artifacts

All implementation tasks start Planned, with no completion claimed. A task's implementation is accepted with the listed evidence, reviewer and date; local and deployed proof remain separate. File names are proposed where not present.

| ID | Work and owner lane | Depends on | Observable completion |
|---|---|---|---|
| O2-00 | Integrator: freeze schemas, access rule, ledger rules and frontend adapter interfaces; add focused modules | This plan | Reviewed API/TS contract map and sample success/error payloads; no silent stock or approval changes |
| O2-01 | Backend A: profile create/read/update and explicit completion; integrator wires central recipient policy | O2-00 | Fresh and existing pending users complete a profile and enter; incomplete/foreign/revoked remain denied; business policy intact |
| O2-02 | Backend A: geospatial discovery, eligibility, pagination and bounded existing-offer migration plan | O2-00 | Nearby eligible open/partially reserved offers returned beyond a global recent-50 boundary; expired/zero unavailable; incomplete search labelled |
| O2-03 | Backend A: durable group CRUD, offer snapshots, quantity totals and versioned edits | O2-00 | Select/change/remove multiple offers, save and reload; unit/coverage rules hold; no inventory mutation |
| O2-04 | Backend B: claims read/cancel/refresh, reserve/resume integration and donor-cancellation guard | O2-00 to build; O2-03 for acceptance | Existing reservation protection retained; failed second stop does not hide first success; plan/claim linkage survives lost response; release rules hold |
| O2-05 | Backend B: collection, receipt, optional handover and receipt adjustments | O2-04 | One operator records short/zero/exact quantities; duplicate retries have one effect; invalid transitions denied; history survives offer closure |
| O2-06 | Backend B: shared impact ledger/read model | O2-05 | Donor and NGO receipt totals match once, including zero and later correction; no receipt means no receipt credit |
| O2-07 | Integrator/geo: shared Maps loader, coarse map contract and server Routes adapter | O2-00; O2-03–04 for live claim routing | Coarse map and exact post-reservation route demonstrated; provider failure truthful; saved origin/base and stop order retained |
| O2-08 | Frontend C: profile, discovery list/map, filters and multi-offer selection | O2-00; O2-01–03 for live acceptance | Complete profile, find and group food on 360 px; deny-GPS/map-unavailable fallbacks; refresh restores saved group |
| O2-09 | Frontend B after backend work: collection detail, reserve, route, collect and receipt forms | O2-03–08 | One operator completes a multi-stop collection; status and per-stop failures are visible; refresh/retry preserves results |
| O2-10 | Frontend B + integrator: NGO impact and donor receipt/handover views | O2-06; O2-09 | Donor sees recipient receipt, NGO sees matching history/totals, optional handover remains separately labelled |
| O2-11 | Optional A after core backend: natural-language search and suggested group | O2-02–03; core O2-08 usable | 10-people/5-km request yields editable need and real offers or honest shortage; model outage leaves manual flow usable |
| O2-12 | Integrator + independent reviewer: full local acceptance and critical boundary review | O2-01–10 | Recorded full journey and failure matrix below; no unit tests; unpassed checks remain open |
| O2-13 | Release owner/integrator: donor+recipient deployment and deployed acceptance | O2-12 and matching donor G1 prerequisites | Named project, authorized release, rollback and same canonical journey on deployed services; no premature gate closure |

Donor detail currently assumes household scope; O2-10 must preserve the selected donor actor when reading/acting for business donors. Use the canonical published offer as the start of recipient acceptance; no new media/AI-intake rewrite is required here.

## 7. Parallel execution and file ownership

Use one integrator plus at most three workers. Root prepares contracts before dispatch. Workers may build UI against fixed fixtures/interfaces, but fixtures stay explicitly synthetic and never become authenticated API fallbacks. Use separate worktrees for later implementation; merge/review one lane at a time. Do not create branches/worktrees from historical unrelated work or copy environment files.

| Lane | Proposed future branch | Owned paths after contracts freeze |
|---|---|---|
| Integrator | `feature/organization-pickup` | `core/identity.py`, shared access helper, router registration, `schemas/recipient*.py` and shared TS contracts/adapters, shared shell/routes, narrow legacy `social_impact.py` wiring, index integration, geo/provider adapter and shared Maps loader |
| A: profile/discovery/groups | `feature/organization-discovery` | New `domain/recipient_profiles.py`, `offer_discovery.py`, `recovery_plans.py`; dedicated endpoint modules; bounded geo backfill tooling |
| B: claims/receipt/impact | `feature/organization-receipts` | New `domain/claims.py`, `impact.py` and dedicated endpoints; then `components/organization/collection-*`, `receipt-*`, `impact-*` and donor feature presentation agreed with integrator |
| C: organization UI | `feature/organization-discovery-ui` | `components/organization/profile-*`, `discovery-*`, `selection-*`, `offer-card*`; map presentation consuming the integrator's loader and frozen adapter |

Wave 0: O2-00 and central seam decisions by integrator; contracts handed to all lanes.

Wave 1 in parallel: A implements O2-01–03; B O2-04–06; C O2-08 UI; integrator O2-07 Maps/routing and shared integration. Shared legacy files have one editor; workers request an integration edit instead of racing on them.

Wave 2: B moves to O2-09–10 UI; A reviews geo/search/profile integration and optionally prepares O2-11; C completes live profile/discovery/group acceptance; integrator connects routes, donor actors and O2-12. AI integration never blocks core acceptance.

Wave 3: accepted release work O2-13 with the matching donor version, followed by the same deployed journey. Provider/API/IAM/cost blockers stay explicit; no production writes or deployment in this planning task.

Critical path: contracts → profile/discovery + claims/receipt → integrated multi-offer UI + exact route → collection/receipt → matching donor impact → end-to-end proof. AI is outside this critical path.

Keep new modules/components below 500 lines and reuse existing Button, Input, Card, Heading and semantic Tailwind tokens. Do not broadly refactor household services, replace the existing auth system or introduce a second backend. Each handoff names changed paths, API version, actual evidence and remaining failures.

## 8. Optional AI proposition

Ship the list, grouping and route first. Then expose a scoped Find food assistant where the organization supplies food/object name, requested quantity and unit, and a pickup origin. Default the origin to the organization's saved Maps-confirmed pickup location, with a per-request Maps location selection. Allow natural language for dietary needs, search radius and pickup deadline. Use the existing Gemini/ADK stack with a strict recovery-need result and bounded input/output/time/cost. The agent can extract typed constraints and ask about portion assumptions; deterministic code performs authorized offer discovery, eligibility checks and quantity totals.

Return up to two meaningfully different feasible pickup plans built from real offer references. Compare coverage/shortfall, number of stops, pickup-window fit, and route travel time so an organization can choose based on its priorities. Do not invent a second option when only one plan is feasible. Do not generate arbitrary UI or extend household access into organization data. If a new typed recovery card is needed, explicitly version it and add one fixed renderer; do not disguise it as a household meal card. Each card's action fills a reviewed selection, never reserves automatically. After the organization chooses and explicitly reserves, the same Google route service supplies the stop order and actual travel time. Keep exact donor locations private until reservation. No model-generated addresses, distances, travel times or safety judgments.

If no model turn completes reliably, leave the assistant input unavailable with manual controls usable. Existing managed-service household requirements stay tracked separately; do not make this small flow depend on rebuilding the entire agent platform or add a transcript-memory feature for organizations.

## 9. Evidence and minimum release gate

The checks here are future implementation acceptance work, not results from this planning session. Use requested lint/type/build, contract/integration/security exercises and browser journeys. Do not create/run frontend/backend unit tests or introduce test dependencies.

| Check | Required observation |
|---|---|
| Profile | A new user completes profile and enters immediately without admin action; another organization/anonymous/revoked identity is denied |
| Discovery | At least three synthetic donor offers include inside/outside radius, partial availability and elapsed-window cases; map/list agree; manual location works |
| Coverage | Select 6 + 4 declared portions for a 10-portion target; show 10 selected; adding a package stays a separate total; people-to-portion assumption explicit |
| Group persistence | Save, refresh, change quantity/remove an unreserved offer, and restore correct organization scope; selection does not alter donor stock; later profile-base edit leaves saved destination intact |
| Reservation | Two organizations compete for remaining food with no overreservation; first selected stop succeeds and second changes, showing both results plainly |
| Privacy | Preclaim payload, map geometry and routes contain no exact donor address/location/media; claimed detail and route reject foreign/revoked claims |
| Routes | Actual Google result shows stop order and base destination; pickup-window warnings visible; unavailable provider has no fabricated ETA; next-stop navigation works |
| Outcomes | Collect 6 and 4 portions, confirm 5 and 4 received: donor totals are 5/4, organization total 9 portions, collected stays 10; zero receipt adds no credit |
| Idempotency | Retry reservation/collection/receipt after an uncertain response and refresh: no orphaned claim, duplicate collection membership/event, stock subtraction or impact credit |
| Correction | Correct receipt 5 to 4 with audit history: both views net 8 portions; no overwrite or double credit |
| Cancellation/expiry | Release an uncollected valid remainder once; expired food does not reopen; donor cancellation cannot strand active reservations; receipt after timely collection remains recordable |
| Donor view | Household and business offer detail show receipt sources; optional handover is distinct; no pantry stock decrement from public offer actions |
| UI | 360 px and desktop, keyboard/focus, 44 px controls; loading/empty/error/pending/conflict/success; lost network preserves inputs and resumes persisted stops |
| Optional AI | If shipped: one real scoped structured turn, two genuinely distinct plan choices where two are feasible, missing-info/portion clarification, selection without auto-reserve, and outage behavior. Otherwise mark O2-11 Deferred, without blocking the manual route journey |

Local acceptance requires O2-01–10 and O2-12 evidence. Deployed release additionally requires O2-13 and matching Phase 1 donor evidence in the same named environment. Record revision/source, date, reviewer, screenshots/readbacks and actual provider response; no earlier phase pass counts substitute for this changed access/lifecycle proof.

The demo should show one organization choosing multiple household offers, reserving them, getting a real route, recording collection and receipt, then a donor refreshing to see its received amount. Start with synthetic, clearly labelled data. Real-world food-safety eligibility boundaries remain in force; profile completion is not a food-safety or NGO-verification certification.

## 10. Sources and next execution checkpoint

- [Previous gap assessment](../knowledge/sessions/2026-10-18-phase2-organization-gap-assessment.md)
- [Phase 0 evidence](../implementation/social-impact-phase0.md), [Phase 1 evidence](../implementation/social-impact-phase1.md), [dated status](../STATUS.md)
- [Earlier Phase 2 contract, revised here](ECOLOOP_IMPLEMENTATION_PHASES_AC_CONTRACTS_V1.md#phase-2--recipient-organization-side-ngo-pickup)
- [Architecture](../knowledge/ARCHITECTURE.md), [decisions](../knowledge/DECISIONS.md), [entry implementation](../knowledge/sessions/2026-10-18-role-based-entry-implementation.md)
- [Google Compute Routes reference](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes), accessed 18 October 2026; no provider call or price measurement performed

Next checkpoint: run the documented local synthetic end-to-end acceptance, then reconcile the live MVPTasks Sheet when authorized. Deployment and live-provider acceptance remain separate release work; this document remains the scope and task breakdown.
