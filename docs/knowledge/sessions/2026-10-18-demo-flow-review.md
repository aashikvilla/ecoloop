# Final demo flow review — 18 October 2026

## Request and scope

Reviewed the proposed `Buying Smarter to Recovering Surplus` five-scene demo against the current repository, deployed household/organization experience, existing implementation notes, and the README demo accounts. Used the consumer demo account to prepare its empty household Kitchen. No deployment or NGO offer/claim/receipt mutation was made.

## Scene-by-scene findings

- **D1 — Photo purchase intelligence: missing.** The existing Gemini photo intake identifies candidate foods for a user to review and confirm as pantry facts. It does not compare a photographed shopping product with confirmed stock or recommend whether to buy. Ask has a text BuyCheck proposal, but the deployed product assistant failed during this review.
- **D2 — Use-soon intelligence: partial.** Home lists recorded dates for confirmed items and Kitchen item detail links to Ask. It has no dedicated `Needs attention` priority section or explicit available-versus-missing ingredients comparison. A deployed assistant turn requested through Ask returned HTTP 504 after 53.75 seconds; the page displayed its unavailable state.
- **D3 — Surplus handoff: partial.** Local source has a Kitchen item → prefilled offer path with canonical reread, donor review, quantity restrictions and safety/storage uncertainty. The `Not cooking this` transition is missing. The latest donor fixes and item-prefill path are not on the deployed revision. No offer was published during this review.
- **D4 — NGO recovery assistant: partial.** The deployed NGO account has deterministic nearby discovery, map/list presentation, multi-offer quantity planning, reservation, collection, receipt and impact views. Natural-language intent extraction and AI dietary matching are absent. Google Routes route calculation code exists, but no server Routes key is configured, so timing/optimization is unavailable. The available synthetic demo offers are only two, and both have existing reservation/completion history; they are not a fresh three-stop fixture.
- **D5 — Verified completion: implemented with live acceptance evidence.** A previous local browser journey reserved two offers, recorded collection and receipt, and verified the same receipt ledger from the donor account. Readback showed two receipts totaling 14 portions. Additional concurrent-claim and retry-after-success acceptance is still open.

## Consumer Kitchen preparation

The README consumer account was signed in to the deployed app. Its active household was `ecoloop-consumer-demo-household` (`EcoLoop Consumer Demo Home`); the API initially returned no Kitchen records. Three version-1 facts were then reviewed and confirmed through the authenticated account command UI:

| Record | Item | Quantity | Date value | Date type |
| --- | --- | --- | --- | --- |
| `food-ea116477-1a48-4015-930c-71ed62156615` | Bread | 1 loaf | 2026-10-19 | `USER_TARGET` |
| `food-646f39b3-e1cd-4c27-a284-2b9735165f5c` | Spinach | 250 g | 2026-10-20 | `USER_TARGET` |
| `food-003c10a1-49b7-4c5d-88e2-2724d770892a` | Tomatoes | 4 pieces | 2026-10-22 | `USER_TARGET` |

The Home page read back all three records and labeled each as a user target. No expiry or use-by date, safety conclusion, condition, or storage history was invented. The records are synthetic demo data and no image was attached.

## AI timeout evidence

- Submitted one bounded `What can I make tonight?` request through deployed Ask while signed in to the consumer demo household.
- Cloud Run request log for revision `ecoloop-api-00036-zoj` recorded HTTP 504 and `53.754726053s` latency at `2026-10-18T11:39:03Z`.
- The API emitted `AGENT_TIMEOUT`; the UI displayed `The household assistant is temporarily unavailable. Try again later.` No assistant proposal turn was returned or persisted.
- No second AI attempt was made. The HLD timeout prerequisite remains open; increasing timeout alone is not a demonstrated fix.

## Demo recommendation

The pantry is prepared for reviewer sign-in and the Home/Kitchen records can be shown immediately. The complete five-scene narration should not be presented as working yet: the live assistant failed, D1 is absent, D3 lacks its transition, D4 has no AI request interpretation, and current NGO offers do not form a fresh three-stop collection. The receipt ledger is the strongest already accepted end-to-end segment.

## Documentation and follow-up

- Added the current pantry and scene status to the root `README.md`; added this journal and a dated implementation-status snapshot.
- No architecture decision changed. Current pointers: [simplified recipient pickup decision](../DECISIONS.md#simplified-recipient-pickup-scope--2026-10-18), [architecture](../ARCHITECTURE.md), and [current MVP contract](../../planning/CURRENT_MVP_SPEC.md).
- No new Past Mistakes pattern was discovered; the observed ADK timeout repeats the existing Gemini/ADK latency lesson in [Past Mistakes](../PAST_MISTAKES.md#2026-10-17-gemini-3-default-thinking-can-consume-the-response-budget).
- No application checks or tests were run for these documentation changes.

## Upstream code comparison and remediation plan

Compared the user-linked `sudikhya/ecoloop` `main` (tip `22552c1`) with this checkout (`dddf9b2`), fetching the branch to `FETCH_HEAD` only. No branch, index, or source files were changed by the comparison. The branches share ancestor `1217c5a` and then diverge.

- No additional clean, required cherry-pick was found for the reviewed demo story. The upstream bounded backend error diagnostic (`1993f78`) is already present locally (`4667fe5`).
- Upstream's recovery planner (`b3cb746`, `dc7fb4c`, `745cc35`, `22552c1`) is a separate implementation under `backend/app/domain/recovery_planning.py` and new standalone ADK packages. The current checkout has its own pickup/receipt modules and flow. Do not import this stack wholesale. Audit/port its transaction guarantees only where the local claim and route-proposal path has a demonstrated gap.
- Upstream household Maps/location and refresh changes are not needed to repair D1–D5. Project, CORS and deployment configuration commits were excluded from the code recommendation as requested.
- Added the ordered, gated plan at [DEMO_FLOW_REMEDIATION_PLAN.md](../../planning/DEMO_FLOW_REMEDIATION_PLAN.md) and linked it from the README. The blocking first phase is root-causing the 504; later gates cover D2, D1, D3, D4 and D5 plus rehearsing with prepared synthetic data.

This was a repository comparison and planning session only; no feature implementation, deployment, account mutation or application check was performed.

## Organization use-case clarification

The owner clarified the intended recovery assistant: an authenticated organization enters the requested food/object, quantity and unit, and a Maps-based pickup origin (defaulting to its saved location, changeable for the request). It may also state dietary requirements, radius and pickup deadline. The assistant finds currently eligible nearby offers and presents up to two distinct feasible multi-stop plans with comparable coverage, shortfall, stops and actual Google Routes timing. The organization chooses a plan; only its explicit reservation claims the offers. Do not invent a second plan when only one is feasible, and clarify or label the assumption when converting people served into food quantity.

For the sample geography, use the existing central Bengaluru NGO base and its 5 km radius. Candidate donor areas are Vasanth Nagar, Shivajinagar, Ulsoor/Halasuru, Richmond Town, Shanti Nagar and Seshadri Puram; verify exact Maps Places and application radius eligibility for every pickup point. The README currently lists only one consumer identity, so the proposed six-account fixture requires at least five additional synthetic consumer identities and 12 or more individually reviewed offers.

Updated the NGO D4 section and Bengaluru data fixture in the [demo remediation plan](../../planning/DEMO_FLOW_REMEDIATION_PLAN.md), plus the optional-AI proposition and acceptance row in the [organization pickup plan](../../planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md). Locality names were checked against [BBMP land-use maps](https://site.bbmp.gov.in/landusemaps.html) and its [Richmond Town](https://site.bbmp.gov.in/PDF/landusemaps/1/1.06-Richmond%20Town.pdf) and [Vasanth Nagar](https://site.bbmp.gov.in/PDF/landusemaps/1/1.04-Vasant%20Nagar.pdf) maps. This remains planning only: no identities, offers or other application data were created, and no app checks were run.
