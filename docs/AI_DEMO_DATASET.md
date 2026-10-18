# Bengaluru AI demo dataset

Updated 18 October 2026. The fixture prepares six synthetic household accounts and one synthetic NGO account for local product review in `ecoloop-staging-20261015`. All account emails and passwords are listed in the root [README demo account table](../README.md#demo-accounts). These are public demo credentials and must not be reused elsewhere.

## Accounts and prepared kitchens

| Consumer | Email | Bengaluru area | Kitchen focus |
| --- | --- | --- | --- |
| Consumer demo | `consumer.demo@ecoloop.example` | MG Road | Spinach, bread, tomatoes, paneer, coriander, onion, garlic, lemon, olive oil; recipe and use-soon demo |
| Vasanth donor | `donor.vasanth@ecoloop.example` | Vasanth Nagar | Baby spinach, tomatoes, bread, onion, garlic, chickpeas, yogurt, lemon; linked surplus handoff scenario |
| Asha donor | `donor.asha@ecoloop.example` | Jayanagar | Spinach, tomatoes, bread, onion, potatoes, ginger, curd |
| Kiran donor | `donor.kiran@ecoloop.example` | Malleshwaram | Spinach, tomatoes, potatoes, onion, rice, moong dal, milk |
| Meera donor | `donor.meera@ecoloop.example` | Basavanagudi | Spinach, tomatoes, carrots, lentils, coconut, onion, coriander |
| Ananya donor | `donor.ananya@ecoloop.example` | Richmond Town | Spinach, tomatoes, paneer, rice, onion, garlic, capsicum |
| NGO | `ngo.demo@ecoloop.example` | Saved Bengaluru pickup base | Searches the twelve synthetic planning scenarios; existing profile is retained |

The first two household IDs and their existing records are retained. The seed only adds a missing food name; it does not replace a confirmed record. For the four added accounts, it creates an active owner membership and a synthetic household. Items are plausible Bengaluru household groceries with quantities supported by the Kitchen schema. Several records have future `BEST_BEFORE`, `USE_BY`, or `USER_TARGET` dates. `USER_TARGET` is only a household reminder; it is not an expiry assertion. `UNKNOWN` dates remain unknown. The app must still require explicit donor review of condition, storage, quantity, and pickup details.

The two featured recipe kitchens have at least six usable ingredients. The primary consumer kitchen supports a spinach, tomato, and bread meal suggestion with paneer, onion, garlic, coriander, lemon, and olive oil available for grounded alternatives. Vasanth's kitchen supports a spinach, tomato, and bread suggestion with onion, garlic, chickpeas, yogurt, and lemon. Gemini may propose recipes from confirmed records, but it must identify missing items as unconfirmed and must not change Kitchen stock.

## Twelve NGO planning scenarios

These are not donor-published offers. They are synthetic AI rehearsal fixtures linked to source Kitchen records, with `demo_scenario: true`, `condition_declaration: UNKNOWN`, and `storage_declaration: UNKNOWN`. Discovery exposes them **only to the seeded `ngo.demo` organization**. The organization UI labels them “Rehearsal only”; plans can be reviewed and saved, but reservation is disabled and the backend rejects any attempted claim. They must never create collection, receipt, impact, or recovered-food records.

| Source household | Scenario items and quantities | Approximate pickup area |
| --- | --- | --- |
| Vasanth | Baby spinach 250 g; tomatoes 5 items | Vasanth Nagar |
| Consumer demo | Spinach 250 g; tomatoes 4 items | MG Road |
| Asha | Spinach 500 g; tomatoes 6 items | Jayanagar |
| Kiran | Spinach 600 g; tomatoes 400 g | Malleshwaram |
| Meera | Spinach 550 g; carrots 500 g | Basavanagudi |
| Ananya | Spinach 500 g; tomatoes 500 g | Richmond Town |

All scenario coordinates are illustrative area centers within approximately five kilometres of the saved NGO pickup base, not physical donor addresses. Pickup window is generated as tomorrow 16:00–19:00 Asia/Kolkata each time the seed runs. The fixture has no declared expiry, storage history, donor suitability assessment, or real stock. Its Kitchen source link preserves the item ID and version for review; it does not assert that the food has been offered in reality.

## NGO request to enter

Use the **saved organization pickup base** as the origin and a 5 km search radius. The prepared offer quantities are grams, so the concrete request uses grams rather than inventing a people-to-weight conversion:

> Find vegetarian spinach for a community meal: 1,500 g total, within 5 km of our saved Bengaluru pickup base, pickup by 7:00 PM tomorrow. Show up to two plans, use the recorded quantities and pickup windows, and report any shortfall. Clearly mark rehearsal-only records and do not treat them as verified or reservable food.

Expected outcome: Gemini extracts the search constraints; deterministic discovery returns relevant spinach scenarios; server-side planning produces up to two distinct quantity-covering alternatives and reports any shortfall. The response must identify that offers are rehearsal-only. Current stop order and displayed distance are approximate straight-line calculations; the assistant proposal path does not call Google Routes for ETA or driving-time ordering. The saved collection-plan route endpoint has a server-restricted Routes API key in Secret Manager and still needs live verification. Do not describe these assistant “plans” as actual routed pickups.

### Local acceptance observed — 18 October 2026

- The refreshed organization workspace displayed all 12 rehearsal records with Bengaluru area labels and their quantities. The exact request above returned two plans: 1,500 g covered using 3 stops (9.6 km approximate), and 1,500 g covered using 4 stops (11.7 km approximate). Both options identified each stop as synthetic and non-reservable.
- An authenticated recipe request for Asha returned a `MealSuggestion` grounded in confirmed spinach, potatoes, and onion, and identified missing cooking ingredients. Kitchen stock was not changed.
- The API health response after this authenticated turn reported `session_store=vertex_ai_verified` and `managed_sessions=true`. This verifies the configured Vertex AI session store for the local request path; it does not mean a managed Agent Runtime deployment or Memory Bank is enabled. Memory Bank remains disabled.
- NGO discovery and planning work locally. The visible route distances/order are straight-line estimates only; no Google Routes request has been made. A separate server-restricted Routes key is configured in Secret Manager for the Cloud Run API runtime and in ignored `backend/.env` locally.

### Deployed main acceptance — 18 October 2026

- Main commit `8f87d66` passed candidate build, configuration/auth smoke, and manual promotion in [GitHub Actions run 39138555396](https://github.com/aashikvilla/ecoloop/actions/runs/39138555396). API revision `ecoloop-api-00041-gul` and web revision `ecoloop-web-00025-yud` now each receive 100% traffic. `/api/v1/health` and `/account` returned HTTP 200.
- Authenticated Asha request to the exact main-commit candidate returned HTTP 200 with a `MealSuggestion` for spinach and potato curry. Its spinach, potato, onion, and ginger references resolved to confirmed Kitchen IDs. No Kitchen mutation occurred. Health after the turn reported `session_store=vertex_ai_verified` and `managed_sessions=true`.
- The first candidate model turn had returned 502 because assistant policy validation rejected model-supplied card metadata. The server now normalizes lifecycle and allowed-action fields after strict typed parsing. The second authenticated turn passed.
- Authenticated NGO request using the exact search text above and the visible form's explicit 19 October 2026 19:00 IST deadline returned `status=plans`, extracted spinach / 1,500 g / vegetarian / 5 km constraints, and returned two full-coverage options with 3 and 4 stops. All twelve records are synthetic and non-reservable. `route_status=unavailable` for these proposal cards; their distances/order remain straight-line estimates.
- The server-only Routes key is separate from the browser key, restricted to `routes.googleapis.com`, stored as Secret Manager `ecoloop-google-maps-routes:1`, and granted only to `ecoloop-api-runtime`. One direct `computeRoutes` request between synthetic Bengaluru coordinates returned a 2,958 m route and 646 s duration. The deployed reservation-based collection route endpoint is configured; the NGO proposal assistant has not yet been changed to call it.
- The original consumer photo-to-pantry check previously passed locally with a synthetic spinach photo. It was not repeated against the deployed endpoint in this pass. The surplus prefill was reviewed, but no offer was published because no physical food was available for a truthful donor condition/storage check. No rehearsal offer was reserved and no receipt or impact record was written.
- Frontend lint, TypeScript, production build, backend compile, workflow YAML parsing, and `git diff --check` passed. No unit tests were run. AI request cap is 12 per user/day. Billing has a ₹2,000 monthly alert but no hard all-services spend ceiling; credits/live billing remain unknown.

To demonstrate portion clarification separately, enter: “We need food for 30 vegetarian people before 7 PM tomorrow, within 5 km of our saved Bengaluru base.” The assistant should ask for serving assumptions instead of inventing them. If the follow-up is in portions, the current grams-based fixture will not be quantity-compatible; do not claim that the assistant converts grams to people. A later product change can support an explicit grams-per-person basis.

## Seed and configuration

From `backend/`, run:

```powershell
.venv/Scripts/python.exe scripts/seed_ai_demo.py
```

The four new demo passwords are read from ignored `backend/.env`; the script never prints them. The script is idempotent for its own marked records and refuses to overwrite a non-synthetic household/offer or a scenario with lifecycle activity. Review the account and quantity tables before changing the fixture.

Local Gemini inference and managed ADK Sessions use the settings in `backend/.env.example` and [the managed-context architecture note](architecture/managed-agent-context.md). Memory Bank stays disabled because this fixture has no approved personal preferences. The existing Agent Engine resource is `projects/ecoloop-staging-20261015/locations/asia-south1/reasoningEngines/8405027522533654528`.

`GOOGLE_MAPS_ROUTES_API_KEY` is provisioned separately from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. The server key is restricted to `routes.googleapis.com`, stored as Secret Manager secret `ecoloop-google-maps-routes` version 1, and accessible only to `ecoloop-api-runtime`; it is also present in ignored `backend/.env` for local server use. Do not place it in `NEXT_PUBLIC_*`, GitHub build variables, or Git. This key covers the existing saved collection-plan route endpoint; AI-generated alternative cards still use approximate stop order/distance until route integration is added there. The last documented owner review found one linked project and a ₹2,000 monthly alert, but no hard all-services spend ceiling; Gemini has a ₹2,000 cap, while credits and live billing visibility remain unknown. Main promotion is complete only after authenticated household and organization AI turns were verified against the exact candidate. Local values remain ignored and were not committed.
