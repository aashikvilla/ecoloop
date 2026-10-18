# EcoLoop demo flow remediation plan

18 October 2026 · Implementation snapshot for `feature/bengaluru-ai-recovery-demo` · Based on the reviewed five-scene demo and current demo evidence.

## Goal

Make the buying-smarter → use-soon → share-surplus → NGO recovery → confirmed handover story runnable in under three minutes using the README demo accounts and prepared data. Confirmed facts and deterministic code own quantities, dates, eligibility, permissions, reservations and recorded outcomes; Gemini proposes and explains actions for a person to review. Source work is local on the feature branch and is not deployed.

## Entry conditions

- Use prepared README demo accounts; do not spend demo time onboarding the kitchen.
- The consumer household already has three confirmed synthetic pantry records: bread, spinach and tomatoes. Their dates are `USER_TARGET` reminders, not expiry/use-by facts. Keep that distinction visible; don't present them as food-safety dates.
- If the narration says “before it expires,” prepare an explicitly synthetic, confirmed date with a supported expiry-date type and provenance before recording. Otherwise say “before your reminder date” and keep the existing records unchanged.
- The deployed Ask request failed with HTTP 504 after 53.75 seconds. Resolve this before relying on any live assistant scene. The local assistant error handler already has bounded server-error diagnostics (local commit `4667fe5`, equivalent to upstream `1993f78`).
- The deployed NGO data has two offers with prior claim/receipt history; the latest code has no configured Google Routes key. A fresh demo collection needs prepared, valid offers and a real route result.
- One additional synthetic Firebase personal account and private household have been created through the authenticated sign-up/household flows. Its Kitchen contains a confirmed 250 g baby spinach record with a household target date and fridge storage. Its access details are in the README.
- No synthetic public surplus offer was published. The app requires a donor to confirm they inspected the food and believe it suitable; no actual surplus food was available to support that declaration.

## Ordered work and gates

### 0. Restore a reliable assistant turn (blocking prerequisite)

Trace one authenticated Ask request through Cloud Run request ID, API/ADK/session calls and provider response. Identify whether the 504 is caused by provider latency, managed-session setup, a retry/wait loop, or request timeout mismatch. Add bounded, privacy-safe stage timings/error causes where missing; keep user content and credentials out of logs. Fix the root cause and verify one authenticated turn returns within the demo budget and doesn't create a turn on timeout. Raising a timeout alone does not pass this gate.

**Gate:** one successful deployed Ask turn, one bounded failure with actionable request-correlated diagnostics, and no duplicate/persisted partial turn. If this gate cannot be met, switch to a truthful recorded/seeded fallback and do not imply Gemini is live in the affected scene.

### 1. Build the use-soon recipe moment (D2) — source implemented

Add a prominent Home `Needs attention` grouping based only on confirmed date value/type and known quantity. Label `USER_TARGET` as a household reminder. From an item, request a contextual meal suggestion grounded in confirmed pantry facts. Display ingredients available and missing separately, explain why the item was prioritized, and keep `Prepare this` as an explicit user action. Do not infer freshness or safety from a photo or reminder date.

Home now groups confirmed records with dates in the next seven days, identifies each date's recorded meaning and links items to a contextual Ask prompt. Meal proposal cards separate exact confirmed Kitchen records from unconfirmed ingredients; recipe quantities are not represented as stock. Local authenticated Gemini/ADK acceptance returned a spinach bruschetta proposal with actual spinach, bread and tomato record IDs, separate unconfirmed olive oil and garlic, and no stock write. The earlier 60-second timeout was traced to 43 repeated pantry tool calls. Selected-item turns now use their freshly loaded Kitchen snapshot without those redundant tools, with a per-turn ADK call limit and bounded timing logs. **Gate remains open:** no deployed/managed-runtime turn has been accepted, and preparation/decline actions remain human-reviewed.

### 2. Add purchase intelligence (D1) — source implemented

Add a shopping-photo flow that sends bounded image bytes to Gemini for a validated product candidate and asks the user to confirm/correct the identification. Deterministic matching compares the confirmed product candidate with the active household pantry using normalized food identity; the recommendation cites matching pantry record(s), quantity and date provenance. If there is no confirmed match or the facts are stale/unknown, say evidence is insufficient and do not discourage purchase.

Added an authenticated transient image-identification endpoint and Shop flow. Candidate text stays reviewable/editable. A fresh Kitchen read performs deterministic exact normalized identity matching and discourages a purchase only when exactly one matching record has positive known quantity. Local photo-to-pantry purchase advice passed with the donor spinach image and confirmed 250 g Kitchen record. **Gate remains open:** no-match and ambiguous-match cases; no upstream commit reviewed here implemented this purchase decision.

### 3. Connect decline-to-cook to reviewed surplus (D3) — source implemented

Add `Not cooking this` to the recipe suggestion. Offer sharing only when confirmed item facts and the product's eligibility rules support it. Prefill an offer from the pantry item, then require donor confirmation of current quantity, condition, storage history, eligibility and pickup window. Preserve date type and provenance. Block expired/use-by-passed, unsafe, unknown-suitability or otherwise ineligible items. Publish only after explicit review; link the offer back to its pantry record and show it in My Offerings and the eligible organization view.

Added the `Not cooking this?` handoff and Kitchen-linked offer prefill. Publish re-reads and version-checks the canonical Kitchen item, checks quantity/unit and date type, and requires donor declarations for condition/storage. Past use-by/expiry and unknown condition/storage remain ineligible. The wizard was reviewed with the new donor Kitchen record; nothing was published because no physical food was available to inspect. **Gate remains open:** acceptance with real, eligible surplus and rejected ineligible cases.

### 4. Make NGO recovery intent explainable and route-real (D4) — typed AI source implemented; provider/route gates open

Organization enters the food/object name, requested quantity and unit, and pickup origin. The origin defaults to the organization's saved Maps-confirmed pickup location and can be changed for this request using a Maps location selection. They can also state dietary needs, a search radius and a pickup deadline. Gemini may turn natural language into these typed constraints and ask for missing portion assumptions; it does not decide what is available.

Deterministic code searches authorized, currently available offers and enforces food identity, unit/quantity, dietary, distance, eligibility and pickup-window constraints. It calculates coverage and any shortfall. If a request says “food for 30 people,” ask how portions are defined or clearly label the configured assumption before converting people to quantity.

Return up to two meaningfully different, feasible pickup plans using real offers. For example, one can prioritize less travel while another prioritizes greater confirmed quantity. Each card shows its stops, quantities, request coverage/shortfall, pickup-window fit, and route time from an actual Google Routes response. Explain the tradeoff in plain language. Do not pad the response with a second option if only one feasible plan exists. If Routes is unavailable, show feasible offer selections without invented times. The organization compares the plans, chooses one and explicitly reserves it; no reservation happens when the agent generates suggestions. Keep exact donor locations private until the corresponding offer is reserved.

For feature acceptance, prepare at least three eligible offers with distinct nearby pickup points in the same demo area, including the offer created in D3 if real eligible surplus is available. For the Bengaluru recording, use the six-account/12+ offer fixture below. Give each offer realistic quantity, dietary attributes, location and pickup window. Do not publish records that assert donor inspection or recipient availability when no actual surplus exists; a safe simulated fixture needs a visibly labeled, non-operational discovery/claim boundary first.

Implemented structured recovery inputs, Maps origin selection, authorized offer discovery, deterministic offer filtering and up to two plan alternatives with coverage/shortfall. The organization assistant has a strict Gemini constraint-extraction endpoint, clarification for missing fields and people-to-portion assumptions, deterministic server-side plan calculation, and a full structured-request path that does not call Gemini. Authenticated local acceptance proved that “30 people” prompts for portions per person; a complete natural-language request reached discovery and truthfully returned no eligible offers. Plans use only authorized current offers, return coarse public offer details, never reserve, and label route timing unavailable while Google Routes is unconfigured. **Gates remain open:** at least two valid and genuinely distinct offer-backed options, route timing from Google Routes, and authenticated plan selection/reservation acceptance. No offer was seeded or published for this work; no Routes key or project setting was changed. See [the organization recovery assistant implementation journal](../knowledge/sessions/2026-10-18-organization-recovery-assistant.md) and [latest AI acceptance](../knowledge/sessions/2026-10-18-ai-demo-fix-acceptance.md).

#### Bengaluru demo fixture

The existing EcoLoop Demo NGO pickup base is in central Bengaluru at the previously selected Maps location, with a 5 km service radius. Use that saved base as the default organization origin, then verify each donor pickup point using Google Places/Maps and the application's actual radius check before adding offers. Candidate nearby areas for distributing six donor accounts are Vasanth Nagar, Shivajinagar, Ulsoor/Halasuru, Richmond Town, Shanti Nagar and Seshadri Puram. These are candidate localities, not guarantees that every address in each area falls inside the 5 km radius; exact selected places and routes determine eligibility. Bengaluru Central/BBMP maps label these central localities, including Vasanth Nagar, Shivajinagar, Richmond Town and Ulsoor ([BBMP land-use maps](https://site.bbmp.gov.in/landusemaps.html), [Richmond Town map](https://site.bbmp.gov.in/PDF/landusemaps/1/1.06-Richmond%20Town.pdf), [Vasanth Nagar map](https://site.bbmp.gov.in/PDF/landusemaps/1/1.04-Vasant%20Nagar.pdf)).

The README currently documents two personal accounts and one organization account. The intended offer fixture needs at least four more synthetic consumer identities, each with its own household, plus at least two separately reviewed offers per consumer (12+ offers total). Do not use synthetic inventory to make public donor suitability claims unless the demo environment has an explicit non-operational simulation mode. Use the supported authenticated account/household/offer flows so owner, item and offer links remain canonical.

### 5. Prove receipt and one-time impact (D5) — existing source; branch acceptance open

Keep the existing reserve → collection → receipt journey. Add acceptance evidence for duplicate retry after success and overlapping claims against the same remaining quantity. Ensure the canonical transaction prevents over-reservation and the donor/recipient impact ledger changes only on confirmed receipt, exactly once. Reconcile both account views against the same canonical receipt.

Existing transaction/idempotency code reserves available quantity and records confirmed receipt quantities. This branch adds donor declaration rechecks at reservation. **Gate remains open:** run retry-after-success and concurrent claim acceptance against isolated demo data; verify one ledger outcome and no over-reservation. Do not add unit tests; use authenticated integration/manual acceptance per project contract.

## Branch verification snapshot

- `pnpm lint` — passed.
- `pnpm exec tsc --noEmit` — passed.
- `backend/.venv/Scripts/python.exe -m compileall -q app` — passed.
- `git diff --check` — passed.
- `pnpm build` — passed, including optimized compilation, type validation and static page generation.
- Local authenticated browser: created one synthetic donor account/household, confirmed one Kitchen record, reviewed the Kitchen-prefilled offer wizard. No offer was published.
- Local `/api/v1/health`: backend healthy, assistant disabled. The deployed Ask 504 remains unresolved. No Gemini image/meal turn, Google Routes response, or new organization pickup was verified.

## Demo rehearsal and evidence

After gates 0–5, rehearse the exact account-switch sequence with persistent login and prepared state: shopping photo → grounded skip-buy explanation → Home alert → grounded meal → decline → reviewed surplus offer → NGO request → matching/shortage and route → reserve → confirm receipt → ledger. Target ≤2:58. Capture a short evidence note with revision, request IDs, route response evidence, offer/receipt IDs, observed timing and pass/fail; keep the final architecture takeaway to the last few seconds. Do not report accuracy percentages without a bounded evaluation set and observed results.

## Upstream code check

Compared the requested `sudikhya/ecoloop` `main` (tip `22552c1`, 18 October 2026) with this checkout (`dddf9b2`), excluding deployment and project/CORS configuration changes from code recommendations. The branches diverge after common ancestor `1217c5a`.

- No wholesale cherry-pick is recommended: upstream introduces a separate surplus/recovery domain and two standalone ADK agent packages, while this checkout already has an organization pickup/receipt implementation in its own domain modules. Importing that large feature stack would duplicate the current path and conflict with the project's one-orchestrator/modular-backend contract.
- The bounded error-diagnostic change (`1993f78`) is already present locally as `4667fe5`; no cherry-pick is needed.
- Upstream route proposal persistence and revalidation fixes (`745cc35`, `22552c1`) target upstream-only `backend/app/domain/recovery_planning.py`. The local organization planner uses different modules, so review/port the underlying transaction guarantees only if local inspection finds a gap; do not cherry-pick these commits as-is.
- Upstream route optimization (`dc7fb4c`) likewise targets its separate planner and requires its own configuration changes. The local code already has a Google Routes integration path; the observed blocker is missing runtime configuration, so no code cherry-pick is indicated from this commit.
- The household Maps and refresh fixes are unrelated to the five demo gaps and existing household setup works for the prepared account. No additional upstream code commit is a clean, necessary cherry-pick for the demo flow based on this comparison.

This comparison is a code-level triage, not a statement that every upstream feature has been independently ported or that deployed behavior is fixed. Before implementation, re-check the upstream tip and the local planner's claim/version/idempotency behavior.
