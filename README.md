# EcoLoop
A planned household food assistant: use what is at home, check before buying, and share before waste.

Start with [the current plan](docs/planning/00_START_HERE.md). Follow the supplied [Stitch designs](docs/prototypes/). The broader platform and dark prototype are [archived](docs/archive/2026-10-15-pre-consumer-replan/README.md).

## Repository status
Frontend/backend remain the initial generic material-catalog scaffold. Household screens, APIs and managed agent/memory integration are planned, not implemented here. This replan changes documentation and guidance only.

- frontend/: Next.js App Router scaffold.
- backend/: FastAPI scaffold.
- docs/planning/: specification, decisions, checklist and snapshots.
- docs/knowledge/: architecture, lessons and handoffs.
- docs/prototypes/: unchanged design references.
- .agents/: current rules, skills and role prompts.

## Existing scaffold commands
Frontend: npm install inside frontend, then npm run dev (localhost:3000).
Backend: install backend/requirements.txt in an isolated Python environment, then uvicorn app.main:app --reload --port 8000 from backend.
Existing API docs: http://localhost:8000/api/v1/docs.
Root convenience scripts remain in package.json. These commands were not executed in this documentation session.
