# EcoLoop

A food assistant for households and community organizations: keep food details in view, share usable surplus, and record what actually happened.

## Current product

- **Personal account:** household Home, Kitchen, Ask, Shop, Activity, and donor offer flows backed by authenticated, scoped APIs.
- **Organization account:** complete a pickup profile, find nearby offers on a list or map, make a multi-offer collection plan, reserve and route pickups, record collected and received quantities, and review confirmed impact. The organization workspace has separate Nearby offers, Collection plans, Received impact, and Pickup profile pages.

See [current implementation status](docs/STATUS.md), [current product specification](docs/planning/CURRENT_MVP_SPEC.md), and [owner setup guide](docs/SETUP.md). The organization pickup scope and acceptance contract are in [the implementation plan](docs/planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md).

The observed AI demo gaps and their ordered remediation gates are in the [demo flow remediation plan](docs/planning/DEMO_FLOW_REMEDIATION_PLAN.md).

## Demo accounts

These shared accounts and their associated records are for development and product review in the configured Firebase project (ecoloop-staging-20261015). No local seed-data setup is needed to sign in. Demo data is synthetic; please do not enter real personal or donor information into these accounts.

| Account | Email | Password | Sign-in |
| --- | --- | --- | --- |
| Personal / consumer | consumer.demo@ecoloop.example | EL!Demo26_Cr3w#8qT2M | [Personal login](http://localhost:3000/login?mode=personal) |
| Personal / consumer donor | donor.vasanth@ecoloop.example | BLR!FreshFood26_V1#8 | [Personal login](http://localhost:3000/login?mode=personal) |
| Personal / consumer donor | donor.asha@ecoloop.example | EcoLoop!Asha-2026-BLR-4xQ7 | [Personal login](http://localhost:3000/login?mode=personal) |
| Personal / consumer donor | donor.kiran@ecoloop.example | EcoLoop!Kiran-2026-BLR-8mV2 | [Personal login](http://localhost:3000/login?mode=personal) |
| Personal / consumer donor | donor.meera@ecoloop.example | EcoLoop!Meera-2026-BLR-6pR9 | [Personal login](http://localhost:3000/login?mode=personal) |
| Personal / consumer donor | donor.ananya@ecoloop.example | EcoLoop!Ananya-2026-BLR-3zT5 | [Personal login](http://localhost:3000/login?mode=personal) |
| Organization / NGO | ngo.demo@ecoloop.example | Eco!qxAmiJYgS6hdJPDh | [Organization login](http://localhost:3000/login?mode=organization&next=%2Forganization) |

Start the local services before opening those links. The accounts are Firebase Auth users with synthetic development records already associated with the configured project; they are not recreated by starting the app. Resetting or replacing that Firebase project will require creating the accounts and demo records again. These passwords are intentionally public demo credentials and must not be reused for any other service.

The six prepared kitchens, twelve NGO planning scenarios, exact natural-language request, seeding procedure, and rehearsal-only limitations are documented in [the AI demo dataset](docs/AI_DEMO_DATASET.md). The database seeder is [seed_ai_demo.py](backend/scripts/seed_ai_demo.py).

## Demo readiness — 18 October 2026

The original consumer account is signed in to the synthetic household `EcoLoop Consumer Demo Home` (`ecoloop-consumer-demo-household`). Its confirmed Kitchen is preloaded with:

| Food | Amount | Recorded date | Meaning |
| --- | ---: | --- | --- |
| Bread | 1 loaf | 19 Oct 2026 | User target date |
| Spinach | 250 g | 20 Oct 2026 | User target date |
| Tomatoes | 4 pieces | 22 Oct 2026 | User target date |

These are synthetic demo observations. The dates are household reminder targets, not expiry or use-by claims; condition, storage history, and donation eligibility are unverified. The item observations were confirmed in the consumer household on 18 October 2026. No image is attached.

The additional synthetic account `donor.vasanth@ecoloop.example` has its own household, `EcoLoop Donor Vasanth Nagar Home` (`359d769ffd334fa39f6dfb2dd63690ac`), with one confirmed record: baby spinach, 250 g, fridge, `USER_TARGET` 20 October 2026. It was entered through candidate review and explicitly confirmed on 18 October 2026. The locality in the household name is a demo label; no exact household address was recorded. Its offer wizard prefilled the confirmed facts, but no public offer was published because no physical donor food was available to inspect and truthfully declare suitable.

The prepared dataset now contains six synthetic household kitchens (45 confirmed Kitchen records total) and twelve NGO-visible rehearsal scenarios. The two featured kitchens are `consumer.demo` and `donor.vasanth`; both have enough recorded ingredients for recipe suggestions and use-soon examples. The detailed household inventory, scenario quantities, account list, exact NGO prompt, seed command, and setup limits are in [the AI demo dataset](docs/AI_DEMO_DATASET.md). The seeded scenarios are intentionally review-only: they are synthetic, have unknown condition/storage, and cannot be reserved or counted as recovered food.

### Demo flow status — deployed AI acceptance, 18 October 2026

| Scene | Current status |
| --- | --- |
| Photograph a product and get duplicate-purchase advice from confirmed pantry facts | **Deployed AI pass.** Gemini identified the prepared photo as “vine tomatoes”; the UI now matches that unambiguous whole-name phrase to Asha's confirmed Tomatoes record (6 pieces, `USER_TARGET`). Neither the image model nor the comparison changes Kitchen stock. Multiple candidate records remain blocked as ambiguous. |
| Use-soon dashboard and grounded recipe suggestion | **Deployed AI pass.** Home shows confirmed items with upcoming recorded dates and labels `USER_TARGET` as a reminder. The authenticated Vertex/ADK request returned “Spinach and Potato Stir-fry,” linked to confirmed spinach, potatoes, onion and ginger records. The proposal stayed pending; no stock changed. Selected-item requests use the already authorized Kitchen snapshot without redundant pantry tool calls and an eight-call ADK cap. |
| Decline cooking and prepare a prefilled surplus offer | **Review handoff passes; publish acceptance pending.** The meal card opens a Kitchen-linked offer draft. The wizard showed 250 g and the recorded `Your reminder` date, and states safety is not assessed. The donor must confirm current condition/storage/quantity; date types are preserved and passed use-by/expiry is blocked. No offer was published because no physical donor food was available to inspect. |
| Organization recovery plans | **Deployed AI + Routes pass.** Gemini interpreted the natural-language request for 1,500 g vegetarian spinach within 5 km by 7 PM tomorrow. Deterministic offer and quantity checks returned two full-coverage plans; Google Routes ordered them and returned round-trip estimates of 23.4 km / 82 minutes (3 stops) and 21.2 km / 77 minutes (4 stops). Stops use approximate public coordinates. A people target still requires an explicit serving assumption. |
| Confirm receipt and show recovery record | **Operational path exists; no current real offer to accept.** All twelve records visible to the seeded NGO are synthetic rehearsal scenarios and cannot be reserved. The current search contains zero operational donor-confirmed offers; the older demo receipt ledger is synthetic history, not a real handover. Do not record collection, receipt or impact until a donor publishes a truthful eligible offer and the NGO actually receives it. |

The prepared story is deployed to the normal app URL on `origin/main` (commit `027a111`; API/web each at 100% traffic after candidate run [39141615248](https://github.com/aashikvilla/ecoloop/actions/runs/39141615248) and live AI smoke). The workflow is live at [EcoLoop](https://ecoloop-web-4wlelpcnca-el.a.run.app). The same Maps key value is used for browser Maps and server Routes through Secret Manager version 2. AI requests share a 300-per-user/day app cap; the Routes service has a separate 20-call-per-organization/day guard. The twelve NGO entries remain synthetic rehearsal records and cannot be reserved or counted as recovered food. Kitchen-linked surplus review, Gemini recipe suggestions, photo purchase matching, Gemini request extraction and Google Routes alternatives are verified. An actual publish/reserve/receipt recording still requires a donor to confirm eligible food and a real NGO pickup. See the [latest AI/Routes acceptance session](docs/knowledge/sessions/2026-10-18-shared-routes-ai-demo-acceptance.md) and [recording runbook](docs/DEMO_RECORDING_RUNBOOK.md).

## Run locally

Start the frontend from frontend:

`bash
pnpm install
pnpm dev -- --port 3000
`

Start the API from backend in another terminal after following [owner setup](docs/SETUP.md):

`bash
uv sync --locked
uv run uvicorn app.main:app --reload --port 8000
`

API documentation is available at http://localhost:8000/api/v1/docs. Protected endpoints require verified Firebase identity and active membership in the selected household or organization.

## Repository layout

- frontend/: Next.js App Router experience and shared components.
- backend/: FastAPI identity, membership, domain operations, and Firestore integration.
- docs/: product contract, implementation status, setup, and acceptance evidence.
- docs/knowledge/: architecture decisions, lessons, and session journals.

No frontend/backend unit tests. Use the allowed lint, type, contract/integration/security, manual accessibility, and end-to-end checks specified in the project instructions. Do not commit real credentials or secrets; the synthetic shared demo passwords above are the explicit exception requested for reviewer access.
