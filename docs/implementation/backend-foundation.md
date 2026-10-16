# Backend foundation — 16 October 2026

## Scope and service boundary

FastAPI is the only authority for household data reads and mutations. The browser demo is separate and synthetic. This foundation removes the generic in-memory materials catalog and does not offer an anonymous backend identity mode.

Every household route requires a Firebase ID token, verified by Firebase Admin with revocation checking, plus an explicit `X-Household-ID`. The server reads `households/{requestedHousehold}/members/{verifiedUid}` and requires the document's UID, `ACTIVE` status, and `OWNER` or `MEMBER` role. It does not trust household IDs or roles from token claims. Missing or foreign membership is denied. Missing ADC, Firebase configuration, or Firestore access returns a safe 503; there is no emulator or development bypass.

The implementation uses only Firebase and Google Cloud services. It does not initialize or claim access to Gemini, ADK, managed Sessions, Memory Bank, Cloud Storage, or a runtime service. The assistant route validates a bounded request and returns `MANAGED_AGENT_UNAVAILABLE` in the uniform safe error envelope with HTTP 503 after identity and membership verification.

## Versioned contracts and mutations

Pydantic commands use `extra="forbid"`, schema version 1, bounded strings/lists/quantities, explicit date types and sources, timezone-aware timestamps, and paired amount/unit fields. The proposal envelope defines the five fixed card discriminants (`MealSuggestion`, `PortionAdjustment`, `BuyCheck`, `FoodAction`, `PreferenceConsent`) with typed payloads. A card is only a proposal; there is no approval endpoint or provider proposal store yet.

`POST /api/v1/facts/confirm` checks every submitted item's base version and writes all selected observations plus an idempotency result in one Firestore transaction. A new observation starts at version 1; confirmation writes a server timestamp and confirming actor; stale versions return 409. `POST /api/v1/outcomes` checks the observation version, appends a distinct outcome, and updates that observation atomically. Used/discarded/handed-over/composted quantities reduce a known matching unit only when the result stays nonnegative; unknown stock remains unknown. Stored outcomes update storage metadata without reducing quantity. An outcome must be later than the current observation timestamp and no more than five minutes ahead of server time; older outcomes require a fresh kitchen reconciliation to avoid applying a historical deduction to already reconciled stock. Each accepted outcome advances the observation timestamp and actor. `reverses_event_id` is rejected until atomic reversal and quantity reconciliation semantics are implemented. `POST /api/v1/shopping` creates or updates an entry with a version check and has no purchase effect. Each idempotency document ID is scoped by command, SHA-256 of actor UID, and caller key; saved actor UID is checked before returning a result. Same-actor/same-key/same-payload retries return the stored result; changed payloads return 409.

Repository paths and ownership fields:

| Firestore path | Purpose and privacy boundary |
| --- | --- |
| `households/{householdId}/members/{uid}` | Server-resolved active membership (`uid`, `role`, `status`, `created_at`). No client access. |
| `households/{householdId}/food_observations/{itemId}` | Confirmed user observations, amount/unit, typed date/source, version and confirmation actor. |
| `households/{householdId}/outcomes/{outcomeId}` | Append-only owner-recorded actual outcome with amount provenance and event time. |
| `households/{householdId}/shopping_entries/{entryId}` | Versioned manual list entry; never a receipt or purchase record. |
| `households/{householdId}/idempotency/{command}:{actorUidHash}:{key}` | Canonical request hash, result and actor UID required for actor-scoped safe retries. Currently retained until a reviewed retention/TTL policy is configured. |

Intake candidates, proposals, consent ledger, memory references and media are not written yet. Owner-private share-log transactions and activity reads are now implemented locally; see [sharing/activity](share-activity.md). Generic `HANDED_OVER` outcomes are rejected so sharing eligibility cannot be bypassed. Future session records must be UID/application scoped; only explicitly approved preferences belong in a consent ledger, never raw transcripts.

## Access, errors, and deletion

`firestore.rules` and `storage.rules` deny all browser reads and writes. The Admin SDK bypasses Firestore rules, so repository paths are built from the resolved principal's household, and membership is rechecked server-side for each request. Storage upload/read endpoints do not exist. An ASGI receive wrapper counts streamed body bytes without buffering the full request; declared `Content-Length` is also rejected early above the configured limit. Responses include a server request ID, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. CORS has no wildcard and allows only the configured origins, methods, and headers.

Errors expose only a stable code, safe message, retryable flag and server-generated request ID. Application code does not log request bodies, tokens, membership documents or provider content. Validation errors omit submitted values. The current liveness endpoint is not a readiness check.

Retention durations and user deletion behavior remain an explicit open decision from M0.02.02. No delete endpoint or Firestore TTL policy is claimed. Before household deletion is enabled, it must enumerate and delete all nested household subcollections (Firestore parent deletion alone is insufficient), clean up any private media and managed provider references, revoke preference recall immediately, and report provider deletion as pending until verified. Idempotency retention must exceed the documented client retry window. No personal transcript or photo is currently stored by this API.

`firestore.indexes.json` declares the two composite indexes used by owner-filtered share/activity timelines. They have not been deployed or proved against Firestore. Queries remain within the authorized household collection; no unscoped collection-group query is used to infer access.

## Routes

- `GET /api/v1/health` — liveness only.
- `GET /api/v1/kitchen` — current household observations.
- `POST /api/v1/facts/confirm` — atomic confirmation.
- `POST /api/v1/outcomes` — atomic owner-reported outcome and eligible stock adjustment.
- `GET|POST /api/v1/shopping` — scoped list read and versioned entry command.
- `GET|POST /api/v1/share-logs`, `PATCH /api/v1/share-logs/{share_id}` — owner-private, versioned sharing lifecycle; handover alone records an outcome and eligible stock effect.
- `GET /api/v1/activity` — bounded owner-recorded outcomes with measurement provenance; excludes recipient labels.
- `POST /api/v1/assistant/turns` — strict bounded input; explicit unavailable response until real managed services are connected.

All routes except root, docs and liveness require Firebase identity and an active explicit household membership. The anonymous browser demo should not call this API.

## Cloud Run packaging and release prerequisites

`backend/Dockerfile` builds only the FastAPI service. Its Python base image is pinned to the Linux amd64 manifest digest, dependencies install from `uv.lock` with `uv sync --locked`, runtime runs as the unprivileged `app` user, and the command binds to Cloud Run's injected `PORT` (8080 fallback for local runs). Build with the repository's `backend/` directory as the context. `backend/.dockerignore` excludes local environments, credential-like files, caches and Git metadata; it does not include frontend or demo assets. The CLI is not installed in the runtime image.

Before a separately authorized release, the owner must select the existing single Google Cloud/Firebase project and region, confirm billing status and budget alerts, and verify the Cloud Run runtime service account has only the required access. Supply Firebase project configuration and any future secrets through reviewed runtime configuration/Secret Manager references; never copy service-account keys or `.env` files into the image. Confirm the approved browser origins and that Firestore/Storage deny-by-default rules are deployed and reviewed. This packaging does not provision IAM, Firebase, secrets, rules, monitoring, rate limiting or managed assistant services. The API currently provides liveness only, so a successful startup probe is not evidence that Firebase identity or Firestore is ready.

For a release, build and inspect the image locally first, then push it to the approved Artifact Registry repository and deploy a new Cloud Run revision only after the project, region, image, runtime identity, ingress, scaling and environment settings have been reviewed. Verify the deployed revision and authenticated, non-mutating smoke behavior before sending traffic. Roll back by routing traffic to the previously verified Cloud Run revision; retain its image until the rollback window closes. No cloud build, push, provisioning, deployment or rollback was performed for this foundation.

## Observed verification

No unit tests or unit-test dependencies were added or run. No paid calls, Firebase provisioning, deployment, or live Firestore writes were performed.

- Python 3.12.15 was available through `uv`; the Windows Store `python.exe` stub was not used.
- `uv run --locked python -m compileall -q app` completed successfully.
- Import inspection confirmed Firebase Admin exposes the token failure exception classes used by the verifier, and importing `app.main` succeeded.
- OpenAPI generation returned 200 and listed the household, command, assistant, health and root paths.
- Inline schema smoke rejected a client-supplied `household_id`, an unpaired amount/unit and an unknown card discriminant; valid versioned confirmation input parsed. Settings rejected a wildcard CORS origin.
- In-process HTTP smoke: `GET /api/v1/kitchen` without credentials returned 401 with the safe `UNAUTHENTICATED` envelope and a server request ID. `POST /api/v1/assistant/turns` without credentials also returned 401 before provider access.
- CORS preflight from `https://untrusted.example` returned 400 with no allow-origin header.
- `uv lock --check` succeeded; `firestore.indexes.json` parsed as JSON and the Firestore/Storage rules files were present.
- Follow-up schema smoke accepted a valid UTC outcome and rejected boolean quantities, boolean versions, and a non-null unsupported reversal reference.
- A chunked ASGI request with no `Content-Length` and a 256,001-byte body returned 413 with `PAYLOAD_TOO_LARGE`, a request ID and `Cache-Control: no-store`. Unauthenticated HTTP responses also included no-store and request ID headers.
- With only the identity/membership dependency overridden for a local route smoke, the assistant endpoint returned 503 `MANAGED_AGENT_UNAVAILABLE` in the safe error envelope with a matching request ID. This did not call Firebase or an AI provider.
- Follow-up review added actor-scoped idempotency document IDs and saved-actor verification, rejection of unsupported reversals, outcome timestamp ordering with a five-minute future tolerance, and server observation/actor updates.
- A Starlette TestClient deprecation warning appeared because its installed version recommends `httpx2`; it did not affect these observed responses.
- Packaging inspection found Docker CLI 28.3.3 and resolved the pinned Linux amd64 base-image digest from Docker Hub. The Docker Desktop Linux engine was unavailable (`docker version` could not connect to its engine), so the Dockerfile and ignore rules were reviewed locally without an image build or cloud registry interaction.

Membership resolution, transaction retries/conflicts, Firebase identity with real credentials, Firestore rules deployment, managed assistant access, media authorization, deletion, and cloud behavior remain unverified. Distributed rate limiting and production abuse controls are not implemented. These files are a local backend foundation, not deployment readiness evidence. The billing-deferred environment has not been provisioned by this work.
