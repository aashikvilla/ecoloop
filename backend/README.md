# EcoLoop household API

FastAPI is the canonical authority for authenticated household reads and mutations. Firebase ID tokens are verified by Firebase Admin, and each household request resolves active membership from Firestore. Missing identity, membership, or verifier/data service fails closed.

## Local setup

Python 3.12 and `uv` are used. Dependencies are locked in `uv.lock`; `requirements.txt` is an exported, hash-pinned snapshot.

```powershell
uv sync --locked
uv run uvicorn app.main:app --reload --port 8000
```

Runtime settings come from process environment variables, which take precedence over the ignored `backend/.env`. Never print or commit that file. `.env.example` is safe to copy as a starting point. Assistant calls require the explicit `AGENT_ENABLED=true` opt-in; provider credentials alone do not enable them. Firebase Admin uses Application Default Credentials or the Cloud Run service identity. Do not put service account keys in this repository.

## API

- `GET /api/v1/health` reports liveness and configured assistant capability without probing providers; it does not prove Firebase or provider access.
- Social-impact foundation routes expose organization membership, private surplus offer draft/edit/publish, approved-recipient discovery and transactional claim reservation. Select scope with `X-Actor-Kind` and `X-Actor-Id`; the server resolves each value against the Firebase UID and current membership. Pending organizations cannot publish or reserve. Public offer views omit precise pickup details and private media identifiers. See [`docs/implementation/social-impact-phase0.md`](../docs/implementation/social-impact-phase0.md) for contracts and emulator acceptance.
- `GET /api/v1/kitchen` and `GET /api/v1/shopping` require `Authorization: Bearer <Firebase ID token>` and `X-Household-ID`.
- `POST /api/v1/facts/confirm`, `/api/v1/outcomes`, and `/api/v1/shopping` are strict, versioned commands with idempotency keys. Shopping also supports scoped list reads and versioned entry changes.
- `GET|POST /api/v1/share-logs`, `PATCH /api/v1/share-logs/{share_id}`, and `GET /api/v1/activity` provide an owner-private sharing lifecycle and bounded, owner-recorded activity. Only an eligible confirmed handover can create a `HANDED_OVER` outcome.
- `POST /api/v1/assistant/turns` verifies identity and active membership before invoking the single ADK assistant. Its tools can read confirmed pantry facts, active shopping, saved meal plans, and approved preferences; every household-scoped tool rechecks current membership. Tools are read-only. Proposals never mutate canonical facts or approve purchases.
- Managed Sessions and Memory Bank are opt-in adapters. Configuration is not evidence of a successful managed request; health marks them unverified until acceptance is completed. Raw transcripts and household inventory are not written to long-term memory.

Errors use a uniform safe envelope with a server-generated request ID. Application code does not log request payloads, tokens, membership contents, or provider data. See [backend foundation](../docs/implementation/backend-foundation.md) for storage and deletion details.

## Agents CLI evaluation preparation

The small dataset at [`docs/eval/household-assistant.synthetic.json`](docs/eval/household-assistant.synthetic.json) is entirely fabricated and contains no real household data. Instructions and prerequisites are in [`docs/eval/README.md`](docs/eval/README.md). It is preparation only: no model calls, CLI evaluation, or cloud calls were made for it.

The backend currently exposes its ADK agent through the authenticated FastAPI boundary. It does not export a standalone Agents CLI ADK app or include an `agents-cli-manifest.yaml`, so do not run eval commands against this backend until that adapter is deliberately prepared and reviewed. Evaluation prompts can assess response behavior; they cannot prove cross-household isolation, membership enforcement, revocation propagation, strict card validation, or absence of canonical writes. Those remain deterministic boundary and integration acceptance requirements.
