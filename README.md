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

### Demo flow status — local AI acceptance run, 18 October 2026

| Scene | Current status |
| --- | --- |
| Photograph a product and get duplicate-purchase advice from confirmed pantry facts | **Photo AI passed locally; edge cases open.** Vertex/Gemini identified a synthetic spinach photo as spinach; the authenticated flow then matched it against the confirmed 250 g spinach record and recommended using existing stock first. The Kitchen was read-only in this check. A separate photo-intake run created an unconfirmed candidate draft, not a Kitchen item. No-match and ambiguous-match cases remain unverified. |
| Use-soon dashboard and grounded recipe suggestion | **Live local AI pass.** Home shows confirmed items with upcoming recorded dates and labels `USER_TARGET` as a reminder. The authenticated Vertex/ADK request returned a spinach bruschetta proposal in about 15 seconds, linked to the actual spinach, bread and tomato record IDs, and separated olive oil and garlic as unconfirmed. The proposal stayed pending; no stock changed. Earlier timeouts were traced to repeated pantry tool calls (43 in one turn); selected-item requests now use the already authorized Kitchen snapshot without redundant tools and an eight-call ADK cap. |
| Decline cooking and prepare a prefilled surplus offer | **Review handoff passes; publish acceptance pending.** The meal card opens a Kitchen-linked offer draft. The wizard showed 250 g and the recorded `Your reminder` date, and states safety is not assessed. The donor must confirm current condition/storage/quantity; date types are preserved and passed use-by/expiry is blocked. No offer was published because no physical donor food was available to inspect. |
| Organization recovery plans | **Local request-to-plan flow passes against seeded rehearsal scenarios.** The NGO dashboard shows all twelve scenarios. The documented request for 1,500 g vegetarian spinach within 5 km returned two distinct options: 3 stops and 9.6 km approximate, or 4 stops and 11.7 km approximate; both cover the requested quantity. The UI labels each stop synthetic and non-reservable. Gemini interpreted the request; deterministic offer/quantity checks produced the alternatives. The 30-person variant asks for serving assumptions rather than inventing a conversion. The assistant cards still show approximate stop order/distance; the separate reserved-collection route endpoint now has its server key and still needs live verification. |
| Confirm receipt and show recovery record | **Existing flow implemented; retry/concurrency proof open.** Earlier authenticated acceptance recorded two receipts totaling 14 portions and donor readback from the same ledger. Retry-after-success and concurrent claim acceptance have not been run for this branch. |

The local prepared story is ready to demonstrate buying advice, a grounded recipe, the Kitchen-linked surplus review handoff, and two NGO recovery-plan alternatives. Be explicit that the twelve NGO entries are synthetic rehearsal records, not real public offers. They cannot be reserved and must not produce collection, receipt, or impact records. The Routes key is now provisioned in Secret Manager for the API runtime; assistant plan cards still use approximate stop order/distance until integrated with the saved collection route endpoint. Local Gemini and Vertex-managed ADK Sessions are enabled and a new authenticated recipe turn verified managed session creation; Memory Bank remains disabled, and there is no managed Agent Runtime deployment. Fresh physical-food donor review, live Routes verification, a deployed AI turn, and a live reserve/receipt from an operational offer remain open. The implementation is being prepared for a no-traffic candidate deployment on `origin/main`; traffic will not be promoted until the live model response is accepted. See the [latest acceptance journal](docs/knowledge/sessions/2026-10-18-ai-demo-data-preparation.md).

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
