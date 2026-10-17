# EcoLoop household API

FastAPI is the canonical authority for authenticated household reads and mutations. Firebase ID tokens are verified by Firebase Admin; every request also resolves the requested household's active membership from Firestore. Missing identity, missing membership, or an unavailable verifier/data service fails closed. The anonymous browser demo remains local to the frontend and has no backend shortcut.

## Local setup

Python 3.12 and `uv` are used. Dependencies are locked in `uv.lock`; `requirements.txt` is an exported, hash-pinned snapshot.

```powershell
uv sync --locked
uv run uvicorn app.main:app --reload --port 8000
```

Runtime configuration comes from process environment variables, which take precedence over `backend/.env` for local development. The `.env` file is git-ignored; never commit or print its values. `.env.example` is safe to copy as a starting point. Assistant calls require the explicit `AGENT_ENABLED=true` opt-in; provider credentials alone do not enable them. Firebase Admin uses Application Default Credentials or the Cloud Run service identity. No service account key belongs in this repository.

## API

- `GET /api/v1/health` — API liveness plus the configured assistant provider (`gemini_developer_api`, `vertex_ai`, or `unavailable`) and opt-in status. Provider reporting does not call the model or validate runtime credentials; health does not prove Firebase access. The current assistant still uses unmanaged in-memory ADK sessions and has no managed Memory Bank integration.
- `GET /api/v1/kitchen` and `/api/v1/shopping` — require `Authorization: Bearer <Firebase ID token>` and `X-Household-ID`.
- `POST /api/v1/facts/confirm`, `/api/v1/outcomes`, and `/api/v1/shopping` — strict versioned commands with idempotency keys.
- `GET|POST /api/v1/share-logs`, `PATCH /api/v1/share-logs/{share_id}`, and `GET /api/v1/activity` — owner-private share lifecycle and bounded owner-recorded activity; only an eligible confirmed handover can create a `HANDED_OVER` outcome.
- `POST /api/v1/assistant/turns` — verifies identity and membership before invoking the single ADK assistant. Its pantry and active-shopping tools are read-only, receive scope from the server-verified session principal, and recheck active membership. The assistant still uses unmanaged in-memory sessions; Managed Sessions and Memory Bank are not implemented or verified.

Errors use a uniform safe envelope with a server generated request ID. Request payloads, identity tokens, membership contents, and provider data are not logged by application code. See [`docs/implementation/backend-foundation.md`](../docs/implementation/backend-foundation.md) for the storage and deletion groundwork and local evidence.
