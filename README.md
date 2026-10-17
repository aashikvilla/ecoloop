# EcoLoop
A household food assistant: use what is at home, check before buying, and record what happened.

Start with [implementation status](docs/STATUS.md), the [current specification](docs/planning/CURRENT_MVP_SPEC.md), and the [owner setup guide](docs/SETUP.md). Follow the supplied [Stitch designs](docs/prototypes/).

## Repository status
The household browser demo and secure backend foundation are implemented locally. The frontend uses synthetic browser data; Ask is scripted. The separate `/account` connection and seeded synthetic Firestore records do not establish live end-to-end identity or canonical product flows. Gemini/ADK work is in progress on a separate branch. Managed Sessions/Memory, authentication setup, live application proof, billing and cloud deployment remain open. See [implementation status](docs/STATUS.md), [observed local evidence](docs/evidence/demo-2026-10-16/README.md) and [backend boundaries](docs/implementation/backend-foundation.md).

- frontend/: Next.js App Router household screens, semantic Tailwind tokens, shared UI/layout and isolated demo store.
- backend/: FastAPI identity, membership, versioned household commands and Firestore repository foundation.
- docs/: status, owner setup and active planning contract.
- docs/knowledge/: architecture, lessons and handoffs.
- docs/prototypes/: unchanged design references.
- .agents/: current rules, skills and role prompts.

## Local demo

From `frontend`, run `npm ci`, then `npm run dev -- --port 3002`. For a local production demo run `npm run build`, then `npm run start -- --port 3002`. Stop dev before rebuilding the same `.next` directory. Settings offers a confirmed reset; browser data is isolated per origin.

From `backend`, set the documented local project and CORS origins, run `uv sync --locked`, then `uv run uvicorn app.main:app --reload --port 8000`. API docs: `http://localhost:8000/api/v1/docs`. Protected endpoints require verified Firebase identity and an active explicit household membership. The anonymous browser demo does not call them. See [owner setup](docs/SETUP.md); never commit credentials.

No frontend/backend unit tests. Allowed checks and deployment prerequisites are recorded in the execution plan. The live Sheet owns full-product status; local checkboxes describe their stated scope only.
