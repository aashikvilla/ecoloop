# EcoLoop
A household food assistant: use what is at home, check before buying, and record what happened.

Start with [the current plan](docs/planning/00_START_HERE.md). Follow the supplied [Stitch designs](docs/prototypes/). The broader platform and dark prototype are [archived](docs/archive/2026-10-15-pre-consumer-replan/README.md).

## Repository status
The household browser demo and secure backend foundation are implemented on `codex/demo-integration`. The frontend uses visibly labeled synthetic browser data; Ask is a scripted sample. It is not yet connected to Firebase identity, canonical API persistence or managed Gemini/ADK/context. Billing and cloud deployment remain deferred. See [observed local evidence](docs/evidence/demo-2026-10-16/README.md) and [backend boundaries](docs/implementation/backend-foundation.md).

- frontend/: Next.js App Router household screens, semantic Tailwind tokens, shared UI/layout and isolated demo store.
- backend/: FastAPI identity, membership, versioned household commands and Firestore repository foundation.
- docs/planning/: specification, decisions, checklist and snapshots.
- docs/knowledge/: architecture, lessons and handoffs.
- docs/prototypes/: unchanged design references.
- .agents/: current rules, skills and role prompts.

## Local demo

From `frontend`, run `npm ci`, then `npm run dev` (localhost:3000). For the production demo run `npm run build`, then `npm run start -- --port 3002`. Stop dev before rebuilding the same `.next` directory. Settings offers a confirmed reset; browser data is isolated per origin.

From `backend`, run `uv sync --locked`, then `uv run uvicorn app.main:app --reload --port 8000`. API docs: `http://localhost:8000/api/v1/docs`. Protected endpoints require verified Firebase identity and an active explicit household membership. The anonymous browser demo does not call them. Configure only documented example settings; never commit credentials.

No frontend/backend unit tests. Allowed checks and deployment prerequisites are recorded in the execution plan. The live Sheet owns full-product status; local checkboxes describe their stated scope only.
