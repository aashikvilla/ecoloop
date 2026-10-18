# Shared Maps key, routed NGO plans and AI demo acceptance — 18 October 2026

## Scope and commits

Completed the owner's request to use the frontend Maps key value for server Routes, raise the EcoLoop AI request allowance to 300, exercise the deployed AI flows, and prepare the recording plan.

- `9d9927b` raises `AI_DAILY_REQUEST_LIMIT` from 12 to 300 in the Cloud Run workflow and mounts Secret Manager version 2 for Routes.
- `f8f6ab5` routes each NGO AI plan through Google Routes, returns route distance/duration and uses optimized waypoint order; the UI distinguishes road estimates from straight-line fallbacks.
- `027a111` lets the photo comparison match an unambiguous whole-name phrase such as “vine tomatoes” to “Tomatoes,” while blocking multiple matches.

All commits are on `main`. GitHub Actions run [39141615248](https://github.com/aashikvilla/ecoloop/actions/runs/39141615248) passed the candidate build plus health/auth smoke. The exact tagged candidates were then verified with authenticated household/organization model turns and manually promoted: API `ecoloop-api-00045-hoc`, web `ecoloop-web-00029-voy`, each at 100% traffic. The public API health returned 200 with Vertex AI and managed ADK Sessions verified; `/shop` returned 200.

## Configuration

- The browser Maps key from GitHub Actions variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and the API setting `GOOGLE_MAPS_ROUTES_API_KEY` now use the same value. Secret Manager `ecoloop-google-maps-routes:2` is mounted to the API; `ecoloop-api-runtime` can access it. The key already permits `routes.googleapis.com`.
- A direct `computeRoutes` request using the version 2 secret returned 6,583 m and 1,321 seconds for Bengaluru points. The request completed without exposing the value in command output.
- The shared key has no website-referrer restriction and an API allowlist containing multiple Maps services. It is already visible in the browser bundle, so this is documented as a hackathon-only setup. Replace it with separately restricted browser and server keys before production.
- The deployed revision has `AI_DAILY_REQUEST_LIMIT=300`. The backend default and `.env.example` also use 300; household ADK, photo identification and NGO request extraction all call the same Firestore per-UID daily counter. Failed model calls reserve a slot. This is an EcoLoop app limit, not a Google project quota or spend cap.
- Google Routes has its separate 20-request-per-organization-per-UTC-day guard. Each distinct plan option consumes one Routes call. The project budget remains alert-only without a hard all-services spend ceiling.
- The ignored local `backend/.env` received appended overrides for the same Routes value and 300 requests/day without displaying or reading its existing contents.

## Authenticated candidate acceptance

All credentials were read from the synthetic demo account table in the README. Requests used the tagged API candidate for commit `027a111`.

### Purchase photo and pantry comparison

Gemini identified the prepared tomato-pack photo as “vine tomatoes.” Asha's Kitchen contains one matching confirmed record named “Tomatoes,” quantity 6 pieces, date type `USER_TARGET`. The frontend's whole-name phrase comparison returned the single record; Kitchen stock remained unchanged. Before this fix, exact whole-string equality failed on the descriptive “vine” modifier. The UI continues to stop when multiple Kitchen records could match.

### Use-soon recipe

The authenticated Asha request returned a `MealSuggestion` titled “Spinach and Potato Stir-fry,” linked to confirmed Spinach, Potatoes, Onion and Ginger observations. A follow-up response stated that spinach's recorded `BEST_BEFORE` date is 20 October and makes it a use-soon priority; it did not label the date as expiry or safety evidence. No stock mutation occurred. Health after the turn reported `session_store=vertex_ai_verified` and `managed_sessions=true`; Memory Bank and managed Agent Runtime remain disabled.

### Natural-language NGO need and road plans

The NGO account supplied the natural-language request in [the demo dataset](../../AI_DEMO_DATASET.md); the structured request supplied only the explicit deadline so Gemini had to extract the item, amount, unit, diet and radius. It extracted spinach, 1,500 g, vegetarian, 5 km and 19 October 2026 at 19:00 IST. Deterministic discovery and quantity checks produced:

| Plan | Coverage | Stops and order | Google Routes round trip |
| --- | ---: | --- | --- |
| Greater coverage | 1,500 / 1,500 g | Basavanagudi → Malleshwaram → Richmond Town | 23.4 km, about 82 min |
| Nearby pickups | 1,500 / 1,500 g | Basavanagudi → Vasanth Nagar → MG Road → Richmond Town | 21.2 km, about 77 min |

Both options are `route_status=available`, grounded in actual discovered offer quantities and routed using approximate public coordinates. Exact pickup details remain protected until an operational reservation. No offer lifecycle writes occurred during this smoke.

### Seed/offer eligibility and handoff limit

The NGO's saved Bengaluru pickup base currently finds twelve offers across six areas. All twelve are visibly synthetic `demo_scenario` records, with unknown condition/storage and no reservation eligibility. The spinach-specific search finds six of those scenarios; operational eligible offers: zero. No offer was published, reserved, collected or received in this acceptance. Earlier demo receipts in the project are synthetic development history and must not be described as real food recovery.

Kitchen-to-surplus prefill and the donor review path were previously reviewed locally. The donor must still physically verify quantity, condition, storage and pickup time before publishing. A truthful end-to-end new pickup/receipt cannot be recorded until there is an actually available and donor-confirmed food offer. Do not change scenario flags or create a fake receipt to bypass that boundary.

## Verification and recording

- GitHub Actions candidate build, candidate health/auth smoke, live AI photo/recipe/NGO extraction and Routes plan acceptance passed.
- Local `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, backend `compileall`, and `git diff --check` passed during the change. No frontend/backend unit tests were added or run.
- The complete 2:58 capture flow, preflight, exact NGO prompt and honest handoff endpoint are in the [recording runbook](../../DEMO_RECORDING_RUNBOOK.md). It can show a real model-assisted purchasing decision, recipe and two Google Routes pickup alternatives; the synthetic offers must remain marked and non-reservable.

## Follow-up pointers

- Current code and seed status: [implementation status](../../STATUS.md)
- Demo accounts, Kitchens and request: [README](../../../README.md#demo-accounts) and [AI demo dataset](../../AI_DEMO_DATASET.md)
- Shared key configuration: [Google Maps key guide](../../implementation/google-maps-keys.md)
- Key, route and synthetic-offer decisions: [Decisions](../DECISIONS.md)
