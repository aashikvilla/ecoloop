# EcoLoop Social Impact — Phased Implementation & Acceptance Contract v1.1

Date: 17 October 2026
Status: implementation specification; NOT a deployment/verification report.
Source baseline: PRODUCT_HLD_LLD.md (17 October) and ECOLOOP_SOCIAL_IMPACT_ARCHITECTURE_V1_FINAL.md.

## Locked decisions
- Donors: households and businesses (including restaurants/retailers).
- Recipients: approved recipient organizations only (NGOs, orphanages, food banks, community kitchens). No person-to-person recipient accounts.
- Fulfilment: recipient pickup. No donor delivery or outsourced dispatch.
- One existing Next.js + FastAPI / Cloud Run stack; Firebase Auth; Firestore; one existing ADK agent and Gemini on Vertex AI. Add private GCS and Maps/Routes only when functional.
- Current evidence: signed-in household creation/discovery accepted on Cloud Run. Direct Vertex low-token request succeeded, but authenticated ADK product turns timed out twice; private browser media, NGO, redistribution, routing and impact NOT verified.

## Release organization

Three sequential release gates, with parallel UI/AI work within each phase:
- Phase 0: Shared data, identity, contract and service foundations; no public feature launch.
- Phase 1: Donor-facing (household + business) end-to-end offer publishing and tracking. Can release independently with zero recipients by showing `open` and `unclaimed`; no simulated claims disguised as genuine.
- Phase 2: Recipient organization discovery -> need search -> route -> reserve -> pickup/receipt, plus verified donor impact. Depends on Phase 1 published offers.

DO NOT launch Phase 2 until Phase 0 access controls and reservation invariants are tested. The ADK timeout is a blocking AI acceptance gate, but not a blocker for deterministic Phase 0 / Phase 1 work.

## Phase 0 — Shared data & contracts

### P0.1 Principal & authorization
**Model:** `ActorContext { uid, actor_kind: household|business|recipient_org, actor_id, role, permissions, membership_version }`, derived server-side from a Firebase ID token plus current membership; the client may request an active actor but never grant itself privileges. Keep existing household membership checks untouched. A `business` is represented as an `organizations` record of type `business_donor`; recipient NGOs are type `recipient_org` with independent approval.

**Collections (proposed; no migration of private pantry to public offers):**

| Collection | Document/key | Minimum fields | Invariant |
|---|---|---|---|
| `organizations` | `{org_id}` | type, name, category, verification_status, pickup_base, version, timestamps | recipient claims require `approved`; business publication requires authorized active publisher |
| `organization_members` | `{org_id}_{uid}` | org_id, uid, role, status, permissions, version | live active membership rechecked every request |
| `surplus_offers` | `{offer_id}` | donor `{kind, owner_id, creator_uid}`, title, category, quantities, tags, expiry/storage declarations, pickup window/location, image IDs, status, version | private by default; no household inventory automatically published |
| `offer_media` | `{media_id}` | offer_id, private GCS object key, mime, upload state, analysis state/observations | no public object URLs |
| `offer_claims` | `{claim_id}` | offer_id, org_id, amount, unit, status, pickup/receipt quantities, idempotency marker, version | reservation transaction guarantees no overclaim |
| `pickup_events` | `{event_id}` | claim_id, type, actor, qty, timestamp, idempotency key | append-only, authorized transitions |
| `impact_events` | deterministic receipt key | claim/offer/donor/org IDs, confirmed qty+unit, receipt event ID, reversal fields | exactly one positive event per accepted receipt |
| `recovery_needs` | `{need_id}` | org_id, people/quantity, constraints, origin, deadline, unknowns | people != portions absent declared conversion |
| `recovery_plans` | `{plan_id}` | org_id, offer IDs, tentative coverage, route, status, versions | proposals never allocate inventory |

**Numeric precision:** choose canonical integer `quantity_minor` + `unit` for weight (grams), volume (millilitres), and counts (integer portions/packages); reject unsupported mixed-unit aggregation. A `quantity_display` can be derived. Snapshot conversion assumptions, do not infer them from photos. Use server timestamps.

**Offer canonical fields:** `quantity_total_minor`, `quantity_available_minor`, `quantity_reserved_minor`, `quantity_collected_minor`, `quantity_received_minor`, `unit`; receipt may be less than collected; derive public display state rather than treating independent statuses as independent truth. For open offers, `available + reserved + collected + discarded_or_cancelled = total` (define separately if a discarded quantity is introduced); never exceed total. Prefer a transaction/event-ledger reconciliation test over trusting UI counts.

**Privacy:** discovery pre-claim gives approximate point/area, general item attributes and pickup window; exact address, instructions, phone visible only to owner and authorized active claimant. Organization details visible according to approved role. Geolocation requires affirmative browser permission or manual selection.

### P0.2 Service/API conventions
- Version base `/api/v1` using existing FastAPI router conventions; do not change existing household API envelopes without compatibility tests.
- Firebase `Authorization: Bearer <token>` required for all domain endpoints. `X-Actor-Kind` and `X-Actor-Id` may select a role/context, but must be resolved against server-side membership.
- All state-changing requests carry `Idempotency-Key`; versioned edits carry `expected_version`/`If-Match`. Errors: 400 malformed inputs, 401 unauthenticated, 403 unauthorized/unapproved, 404 hidden/nonexistent, 409 version/status/quantity conflict, 422 incomplete publication declarations, 429 quota, 502/503 provider failure, 504 inference timeout.
- Standard error shape proposed: `{ "error": { "code": "OFFER_VERSION_CONFLICT", "message": "...", "details": {} }, "trace_id": "..." }`; adopt existing response envelope if incompatible rather than introducing two competing standards.
- Data access: API service account via Admin SDK; no broad client Firestore writes. Server checks access for every read and transaction. Keep sensitive fields out of Gemini prompts and logs.

### P0.3 Firestore indexes / storage / external contracts
- Proposed composite indexes to test in emulator: offers `(visibility, status, geohash)` with filters resolved by bounding ranges + distance post-filter; offers `(donor.kind, donor.owner_id, created_at DESC)`; claims `(recipient_org_id, status, reserved_at DESC)`; claims `(offer_id, status)`; events `(claim_id, occurred_at)`; impact `(donor_kind, donor_owner_id, recorded_at)` and `(recipient_org_id, recorded_at)`. Validate actual query shapes against real Firestore index recommendations before deploying indexes.
- `private-offer-media/{owner_kind}/{owner_id}/{offer_id}/{media_id}` GCS keys; backend-mediated upload or short-lived signed upload with finalize and ownership check. Validate MIME via content inspection, size, count, storage permissions. Explicit retention policy TBD; never show raw storage path to other actors.
- Maps: geocoding/autocomplete/pin frontend, Routes API server-only. Keys restricted appropriately. Route times only from provider response; failures return `route_unavailable`.
- Gemini image output is non-authoritative structured suggestion `{visible_food, packaging_observations, label_text, uncertainty, missing_fields}`. No safety certification or expiry assertion where label is unreadable.
- ADK natural language parsing returns validated `RecoveryNeedDraft` with `missing_fields`; no model writes/claims. Existing Cloud Run AI timeouts must be diagnosed and an authenticated structured turn observed before Phase 2 AI acceptance.

### Phase 0 acceptance criteria (AC)
| ID | Given / When / Then | Evidence |
|---|---|---|
| AC0-01 | Given an existing household member, when using old household endpoints, then creation/discovery/auth still work | Cloud Run regression |
| AC0-02 | Given a household UID not in Business B, when selecting Business B, then publishing and private reads return 403/404 | API integration test |
| AC0-03 | Given unapproved or revoked recipient org member, when searching/claiming, then access is denied | authorization tests |
| AC0-04 | Given an offer with 10 units, when two concurrent claims request 7, then one is accepted and one fails 409, with total reserved <=10 | Firestore emulator concurrent test |
| AC0-05 | Given repeated identical idempotency key, when retrying a mutation, then same canonical result is returned and no duplicate events occur | replay test |
| AC0-06 | Given a published offer, when an unrelated caller reads it, then exact address and private media are not exposed | API response snapshot tests |
| AC0-07 | Given image storage credentials and URL, when an unauthorized browser accesses object, then request fails | GCS private object test |
| AC0-08 | Given unsupported quantity unit conversions, when attempting addition, then backend refuses to claim full people/portion coverage | unit contract test |

**Gate G0:** schema validated; Firestore rules/API guards and tests pass; collection/index deploy plan tested; existing household regressions green. No production AI claim made merely from Vertex smoke test.

## Phase 1 — Donor side (households + businesses)

### Journey
Choose donor profile -> `Create offering` -> photograph (optional/manual fallback, preferred for demo) -> Gemini suggests visible food details -> donor explicitly supplies quantity, allergens/unknowns, preparation/storage/expiry declarations, pickup location & window -> preview -> publish -> `My offerings` with status and claim progress -> impact eventually from Phase 2 receipt.

**UX:** business account/org selection; current location permission requested after tap; manual location search and draggable pin; show privacy preview (approx public vs exact after claim); image analysis labelled observations; edit/cancel/expire with conflict handling. Dashboard before Phase 2 shows `offered` and `available`, NOT `rescued`.

### API contract — Phase 1

| Method/path | Request | Response | Key checks |
|---|---|---|---|
| `POST /api/v1/organizations` | `{type:'business_donor', name, ...}` | org pending/active under business policy | caller becomes admin only through controlled create; not recipient approval |
| `GET /api/v1/organizations/me` | no body | authorized orgs + roles | active server-side membership |
| `POST /api/v1/offers` | `{actor_ref, title?, category?}` | `{offer_id, status:'draft', version}` | server resolves donor ownership |
| `PATCH /api/v1/offers/{id}` | `{expected_version, title, quantity:{amount,unit}, ... , pickup_window, pickup_location}` | updated draft/version | server validates coordinate/time bounds and declarations |
| `POST /api/v1/offers/{id}/media` | validated binary or upload-init metadata | media_id + status | donor authorization, private GCS, size/type limits |
| `POST /api/v1/offers/{id}/analyze` | `{media_ids:[...]}` | observational suggestion + missing fields | Gemini timeout -> manual UI; never auto-publish |
| `POST /api/v1/offers/{id}/publish` | `{expected_version, confirmed:true}` | published offer/status/version | required fields, signed-in donor, time window valid |
| `GET /api/v1/offers/mine` | `actor_ref, status?, cursor?` | private paginated offers | exact actor ownership; no cross-donor leak |
| `GET /api/v1/offers/{id}` | no body | detail scoped by actor | donor full; eventual NGO sanitized |
| `POST /api/v1/offers/{id}/cancel` | `{expected_version, reason}` | new status/version | cannot silently cancel collected food; conflicts explicit |

**Recommended input requirement (design decision, confirm country-specific rules before real use):** food title/category, quantity/unit, pickup availability, contact method, approximate + exact address, donation category, storage state, allergens (including `unknown`), expiry/preparation declaration (including `unknown` where policy permits), donor confirmation that details are correct. No inference of safety from photos.

### Phase 1 AC
| ID | Given / When / Then | Evidence |
|---|---|---|
| AC1-01 | Given household member, when creating/editing/publishing, then own offer becomes searchable in canonical state | deployed end-to-end |
| AC1-02 | Given authorized business publisher, when creating offer, then offer donor scope is business and never leaks private household records | deployed + auth test |
| AC1-03 | Given geolocation permission denied, when entering manual location and moving pin, then saved pickup coordinates/address reflect donor confirmation | browser E2E |
| AC1-04 | Given an image with unreadable expiry, when analyzed, then expiry stays unknown, suggestions are editable, and no `safe` certification appears | Gemini test case |
| AC1-05 | Given Vertex/ADK timeout, when uploading/creating, then donor can complete manual offering with truthful no-AI indication | outage test |
| AC1-06 | Given missing required quantity or pickup time, when publishing, then 422 returns field-level errors and draft remains intact | API test |
| AC1-07 | Given parallel edits / stale version, when saving, then 409 appears and user can refresh without silent overwrite | concurrency test |
| AC1-08 | Given an open offer, when viewing My Offerings, then status and available quantity reflect Firestore; no fabricated pickup/delivery | deployed refresh test |
| AC1-09 | Given unauthorized viewer, when accessing image, then private object inaccessible | access test |

**Gate G1:** one household + one business donor publishes and sees an image-backed (or manual fallback) offer on Cloud Run; image extraction runs on Google Vertex with captured tests when available; older household flows unaffected. Real NGO claims not yet present; donor impact displays zero verified recoveries.

## Phase 2 — Vendor/NGO side (recipient organization pickup)

### Journey
Org creates profile -> admin-approved recipient status (seeded/manual for hackathon) -> coordinator grants roles -> sees nearby offer map/list -> optional natural-language need `food for 30 vegetarian people` -> Gemini extracts constraints, missing portion conversion explicitly highlighted -> backend gets eligible offers / ranks by factual constraints -> coordinator chooses offers -> Routes API computes route (or unavailable fallback) -> coordinator reserves amounts -> assigned collector sees pickup instructions -> donor confirms handover -> collector confirms collected quantity -> authorized NGO coordinator confirms received quantity -> deduplicated impact event becomes visible to donor and NGO.

**NGO operational requirements:** verified actual available qty, pickup deadline, distance/time, dietary/allergen declarations, storage/unknown warnings, available collection slots, donor pickup instructions (after reservation), route/vehicle mode, split/partial claims, cancellation and fallback, shortages/unmet requirements, contact coordination, who is collector and stage of pickup. For 30 people, show `people requested` separately from `portions confirmed`; conversion only from explicit declared servings.

### API contract — Phase 2
| Method/path | Request | Response | Key checks |
|---|---|---|---|
| `POST /api/v1/organizations` | `{type:'recipient_org', category, name, pickup_base}` | pending org | cannot self-approve |
| `GET /api/v1/offers` | `center, radius_km, filters, cursor` | sanitized eligible offers | approved active recipient org only; geohash then exact distance |
| `POST /api/v1/recovery/search` | `{message, origin, radius_km?, organization_context}` | `{parsed_need, missing_fields, candidates, coverage, explanations}` | bounded Gemini/ADK + deterministic filtering; no claims |
| `POST /api/v1/recovery/routes` | `{offer_ids, origin, travel_mode, pickup_constraints?}` | `{route, stop_order, estimates, warnings, provider}` | Google Routes provider result only; stale offers rechecked |
| `POST /api/v1/recovery/plans` | `{need, selected_offer_ids, route_ref?}` | proposal/id, versions | proposal is not reservation |
| `POST /api/v1/offers/{id}/claims` | `{requested_quantity, expected_offer_version}` | `{claim_id, reserved_amount, reservation_expiry}` | approved org coordinator; Firestore atomic per-offer check |
| `GET /api/v1/claims/mine` | `org, status?, cursor` | scoped claims | active org member only |
| `POST /api/v1/claims/{id}/cancel` | `{reason, expected_version}` | canonical claim + available qty | release only uncollected qty if offer still valid |
| `POST /api/v1/claims/{id}/events` | `{type, quantity, expected_version}` | persisted event + canonical state | `donor_handover` donor; `collector_collected` assigned org collector; `org_received` authorized coordinator; idempotent |
| `GET /api/v1/impact/me` | `donor actor, period` | confirmed received by unit + completed handovers | derive exclusively from receipt events, including reversals |
| `GET /api/v1/organizations/{id}/impact` | `period` | same for recipient org | only org members with permission |

**State machines:**
- Offer: `draft -> open -> partially_reserved/fully_reserved -> closed/expired/cancelled`; view status derived from availability and claims. Publishing is explicit. A reserved claim isn't automatically cancelled if posting expires: claim expiry policy separate.
- Claim: `reserved -> pickup_in_progress -> collected -> received`, or `cancelled/expired/disputed`. No live tracking implied by `pickup_in_progress`.
- Audit: reservation and all pickup transitions append events; receipt transaction inserts deterministic `impact_events/{claim_id}_{receipt_revision}` once. On disputes, append reversing event; never silently overwrite the impact number.
- Multi-offer reservations: each per-offer reservation is atomic; the bundle is **not** atomic in MVP. Show partial successes, reject stale routes, allow cancellation.

### Phase 2 AC
| ID | Given / When / Then | Evidence |
|---|---|---|
| AC2-01 | Given pending/revoked recipient organization, when opening discovery/claims, then 403 (or 404 to hide resource); no private map/address leak | auth tests |
| AC2-02 | Given approved NGO, when searching within radius, then only open eligible offers are returned and preclaim pickup address is coarse | Firestore+UI |
| AC2-03 | Given natural-language request for 30 people with no declared serving size, when responding, then AI extracts 30, states unknown serving conversion and never claims 30 meals found | Gemini schema test |
| AC2-04 | Given mismatched dietary/allergen declaration or expired pickup window, when filtering, then offer is excluded or clearly marked uncertain per policy | rule tests |
| AC2-05 | Given offer IDs selected, when requesting route, then travel times originate from Google Routes; if unavailable, UI says unavailable (not guessed) | provider stub & live integration |
| AC2-06 | Given 10 portions remain and two NGOs each reserve 7, when racing, then 1 succeeds; other gets 409, no overreservation | parallel emulator test |
| AC2-07 | Given reserved claim, when viewing details, then active claimant can see address/instructions, unrelated NGO cannot | access tests |
| AC2-08 | Given donor/collector/coordinator staged handover, when events are posted, then only authorized actor advances permitted state and quantities reconcile | API state tests |
| AC2-09 | Given reserved or in-transit claim without receipt, when querying impact, then verified received remains zero | ledger tests |
| AC2-10 | Given receipt accepted and same request retried, when reading donor/NGO impact, then exactly one credited event and same quantity on both sides | idempotency + refresh |
| AC2-11 | Given disputes/short receipt, when correcting, then impact reflects net verified receipt with traceable adjustment | audit tests |
| AC2-12 | Given two selected offers where second is stale, when reserving bundle, then first success and second failure are both explicit; no false all-or-nothing result | UI integration |
| AC2-13 | Given model outage, when organization browses filters manually, then it can still discover, claim and collect eligible offers without a fake agent result | outage E2E |

**Gate G2:** deployed NGO account approved through real admin/seeded process; request-to-route-to-reservation-to-collection-to-receipt works against canonical data; verified donor & NGO impact changes once; AI is validated end-to-end when claimed as live; one concurrency failure and one missing-information failure shown in test evidence.

## Implementation task graph / suggested build batches

| Batch | Phase | Tasks | Parallelizable | Exit artifact |
|---|---|---|---|---|
| B0 | 0 | Freeze enums, OpenAPI/Pydantic/TypeScript schemas, actor/permission matrix | backend+frontend contracts | contract fixtures, schema snapshots |
| B1 | 0 | Firestore collections/transactions, org-role ACL tests, idempotency, geohash indexes | storage/auth | emulator test suite |
| B2 | 0 | GCS and Maps/Vertex adapters, local provider stubs, troubleshoot existing ADK timeout | integrations in parallel | integration smoke proofs / failure contracts |
| B3 | 1 | Donor UI/form/profile, draft/publish/list APIs, manual location | frontend+backend | household & business published offers |
| B4 | 1 | Private media upload, bounded Gemini observations, editing/error UX | UI+AI in parallel | tested photo->edit->publish |
| B5 | 2 | NGO onboarding and role gate, map/list, public offer search | frontend+backend | approved NGO discovers real offers |
| B6 | 2 | ADK need extraction, deterministic offer matching, optional Maps route | AI+geo in parallel | 30-people query with evidence + route/fallback |
| B7 | 2 | Claim transaction, pickup event state machine, deduped receipt/impact | backend primary | reservation race and verified receipt tests |
| B8 | 2 | Full browser E2E, cloud QA, demo recording, documentation | whole team | verified acceptance matrix, video-ready journey |

### Critical path
`B0 -> B1 -> B3 -> B4 -> B5 -> B6 -> B7 -> B8`. B2 adapters can run concurrently, but production AI acceptance must be resolved before claiming Gemini integration works. Claim code from B7 can start in parallel with B6 once B1 contracts are fixed.

### Effort estimate (planning ONLY, not measurement)
- B0–B2 foundation: ~0.5–1.5 developer-days subject to auth/index/GCS state.
- Phase 1: ~1–2 developer-days for narrow form + media + publishing.
- Phase 2: ~2–4 developer-days for org UI/map/search/claim/receipt/impact and testing.
- With less than one day to the stated 18 October 2026 competition deadline, full P0 across all batches carries severe schedule risk. Prototype scope must be reduced to complete one traceable journey, not falsely claim all features.

## Proposed code ownership (paths are plans unless already in baseline HLD)
| Location | Change |
|---|---|
| `backend/app/core/identity.py`, `core/firestore.py` | add actor principal and scoped access (preserve current household checks) |
| `backend/app/schemas/{organizations,offers,recovery,claims,impact}.py` | new Pydantic contracts |
| `backend/app/domain/{organizations,offers,media,geo,recovery,claims,impact}.py` | deterministic domain services |
| `backend/app/api/v1/endpoints/{organizations,offers,recovery,claims,impact}.py` | routers |
| `backend/app/agents/household.py` | extend existing ADK tool set with scoped read tools, without refactoring old household behavior |
| `backend/app/domain/ai_usage.py` | retain quotas and enforce bounded image/search calls |
| `backend/app/integrations/{google_maps,vertex_images}.py` | new bounded provider adapters |
| `frontend/src/...` | donor offers & impact, org onboarding/discovery/map/chat/pickup views; fixed typed cards |

## Guardrails and open decisions
- Legal food donation/storage constraints vary by jurisdiction: do not assert food is safe from visual evidence. Before real operations choose locale and document eligible categories and donor/recipient responsibility.
- Organization `approved` status is manual/admin-reviewed in MVP; do not equate with legal NGO validation.
- Exact map service capabilities, pricing, key provisioning and optimized waypoint availability require actual integration checks.
- Fix Cloud Run ADK 20/50s timeouts before production claims of product AI; Gemini image analysis can call Vertex directly with bounded schema if more reliable.
- Confirm retention/deletion, dispute handling, authorized contact exchange, and no-recipient fallback before public launch.
- Impact metric is `verified quantity received`; `people fed`, `meals served`, avoided waste and carbon remain unverified unless measured independently.

## Exit checklist
- G0: 8/8 common AC passed + old household regression.
- G1: 9/9 donor AC passed on deployed stack (or openly document skipped/failed items).
- G2: 13/13 NGO AC passed, or report exact unimplemented status. Deployment, route provider and Gemini status must be supported by actual logged calls, not mock responses.
- Public demo data explicitly synthetic unless actual partner permission/evidence is available.
