# EcoLoop household API

FastAPI is the canonical authority for authenticated household reads and mutations. Firebase ID tokens are verified by Firebase Admin; every request also resolves the requested household's active membership from Firestore. Missing identity, missing membership, or an unavailable verifier/data service fails closed. The anonymous browser demo remains local to the frontend and has no backend shortcut.

## Local setup

Python 3.12 and `uv` are used. Dependencies are locked in `uv.lock`; `requirements.txt` is an exported, hash-pinned snapshot.

```powershell
uv sync --locked
uv run uvicorn app.main:app --reload --port 8000
```

Runtime configuration comes from process environment variables. `.env.example` is a reference only; the application does not load `.env` files. Firebase Admin uses Application Default Credentials or the Cloud Run service identity. No service account key belongs in this repository.

## API

- `GET /api/v1/health` — liveness only; it does not prove Firebase access.
- `GET /api/v1/kitchen` and `/api/v1/shopping` — require `Authorization: Bearer <Firebase ID token>` and `X-Household-ID`.
- `POST /api/v1/facts/confirm`, `/api/v1/outcomes`, and `/api/v1/shopping` — strict versioned commands with idempotency keys.
- `POST /api/v1/assistant/turns` — verifies identity and membership, then returns an explicit unavailable response until managed Gemini/ADK/Session/Memory Bank integration is configured.

Errors use a uniform safe envelope with a server generated request ID. Request payloads, identity tokens, membership contents, and provider data are not logged by application code. See [`docs/implementation/backend-foundation.md`](../docs/implementation/backend-foundation.md) for the storage and deletion groundwork and local evidence.
