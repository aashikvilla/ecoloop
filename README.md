# EcoLoop

A food assistant for households and community organizations: keep food details in view, share usable surplus, and record what actually happened.

## Current product

- **Personal account:** household Home, Kitchen, Ask, Shop, Activity, and donor offer flows backed by authenticated, scoped APIs.
- **Organization account:** complete a pickup profile, find nearby offers on a list or map, make a multi-offer collection plan, reserve and route pickups, record collected and received quantities, and review confirmed impact. The organization workspace has separate Nearby offers, Collection plans, Received impact, and Pickup profile pages.

See [current implementation status](docs/STATUS.md), [current product specification](docs/planning/CURRENT_MVP_SPEC.md), and [owner setup guide](docs/SETUP.md). The organization pickup scope and acceptance contract are in [the implementation plan](docs/planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md).

## Demo accounts

These shared accounts and their associated records are for development and product review in the configured Firebase project (coloop-staging-20261015). No local seed-data setup is needed to sign in. Demo data is synthetic; please do not enter real personal or donor information into these accounts.

| Account | Email | Password | Sign-in |
| --- | --- | --- | --- |
| Personal / consumer | consumer.demo@ecoloop.example | EL!Demo26_Cr3w#8qT2M | [Personal login](http://localhost:3000/login?mode=personal) |
| Organization / NGO | ngo.demo@ecoloop.example | Eco!qxAmiJYgS6hdJPDh | [Organization login](http://localhost:3000/login?mode=organization&next=%2Forganization) |

Start the local services before opening those links. The accounts are Firebase Auth users with synthetic development records already associated with the configured project; they are not recreated by starting the app. Resetting or replacing that Firebase project will require creating the accounts and demo records again. These passwords are intentionally public demo credentials and must not be reused for any other service.

## Run locally

Start the frontend from rontend:

`ash
pnpm install
pnpm dev -- --port 3000
`

Start the API from ackend in another terminal after following [owner setup](docs/SETUP.md):

`ash
uv sync --locked
uv run uvicorn app.main:app --reload --port 8000
`

API documentation is available at http://localhost:8000/api/v1/docs. Protected endpoints require verified Firebase identity and active membership in the selected household or organization.

## Repository layout

- rontend/: Next.js App Router experience and shared components.
- ackend/: FastAPI identity, membership, domain operations, and Firestore integration.
- docs/: product contract, implementation status, setup, and acceptance evidence.
- docs/knowledge/: architecture decisions, lessons, and session journals.

No frontend/backend unit tests. Use the allowed lint, type, contract/integration/security, manual accessibility, and end-to-end checks specified in the project instructions. Do not commit real credentials or secrets; the two shared demo passwords above are the explicit exception requested for reviewer access.
