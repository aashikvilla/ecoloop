# Backend foundation — 16 October 2026

## Scope and service boundary

FastAPI is the only authority for household data reads and mutations. The browser demo is separate and synthetic. This foundation removes the generic in-memory materials catalog and does not offer an anonymous backend identity mode.

Every household route requires a Firebase ID token, verified by Firebase Admin with revocation checking, plus an explicit `X-Household-ID`. The server reads `households/{requestedHousehold}/members/{verifiedUid}` and requires the document's UID, `ACTIVE` status, and `OWNER` or `MEMBER` role. It does not trust household IDs or roles from token claims. Missing or foreign membership is denied. Missing ADC, Firebase configuration, or Firestore access returns a safe 503; there is no emulator or development bypass.

The implementation uses only Firebase and Google Cloud services. It does not initialize or claim access to Gemini, ADK, managed Sessions, Memory Bank, Cloud Storage, or a runtime service. The assistant route validates a bounded request and returns `MANAGED_AGENT_UNAVAILABLE` with HTTP 503 after identity and membership verification.

## Versioned contracts and mutations

Pydantic commands use `extra="forbid"`, schema version 1, bounded strings/lists/quantities, explicit date types and sources, timezone-aware timestamps, and paired amount/unit fields. The proposal envelope defines the five fixed card discriminants (`MealSuggestion`, `PortionAdjustment`, `BuyCheck`, `FoodAction`, `PreferenceConsent`) with typed payloads. A card is only a proposal; there is no approval endpoint or provider proposal store yet.

`POST /api/v1/facts/confirm` checks every submitted item's base version and writes all selected observations plus an idempotency result in one Firestore transaction. A new observation starts at version 1; stale versions return 409. `POST /api/v1/outcomes` checks the observation version, appends a distinct outcome, and updates that observation atomically. Used/discarded/handed-over/composted quantities reduce a known matching unit only when the result stays nonnegative; unknown stock remains unknown. Stored outcomes update storage metadata without reducing quantity. `POST /api/v1/shopping` creates or updates an entry with a version check and has no purchase effect. Each command binds its key to a canonical payload hash: same-key/same-payload retries return the stored result; same-key/different-payload returns 409.

Repository paths and ownership fields:

| Firestore path | Purpose and privacy boundary |
| --- | --- |
| `households/{householdId}/members/{uid}` | Server-resolved active membership (`uid`, `role`, `status`, `created_at`). No client access. |
| `households/{householdId}/food_observations/{itemId}` | Confirmed user observations, amount/unit, typed date/source, version and confirmation actor. |
| `households/{householdId}/outcomes/{outcomeId}` | Append-only owner-recorded actual outcome with amount provenance and event time. |
| `households/{householdId}/shopping_entries/{entryId}` | Versioned manual list entry; never a receipt or purchase record. |
| `households/{householdId}/idempotency/{command}:{key}` | Canonical request hash and result required for safe retries. Currently retained until a reviewed retention/TTL policy is configured. |

Intake candidates, proposals, consent ledger, memory references, share logs and media are not written yet. Future session records must be UID/application scoped; only explicitly approved preferences belong in a consent ledger, never raw transcripts. Future share logs must be owner-only and must not expose recipient contact details. These are schema/privacy constraints, not implemented features.

## Access, errors, and deletion

`firestore.rules` and `storage.rules` deny all browser reads and writes. The Admin SDK bypasses Firestore rules, so repository paths are built from the resolved principal's household, and membership is rechecked server-side for each request. Storage upload/read endpoints do not exist. The no-store response header, bounded request `Content-Length`, no wildcard CORS, and an allowlist of methods/headers form the HTTP baseline.

Errors expose only a stable code, safe message, retryable flag and server-generated request ID. Application code does not log request bodies, tokens, membership documents or provider content. Validation errors omit submitted values. The current liveness endpoint is not a readiness check.

Retention durations and user deletion behavior remain an explicit open decision from M0.02.02. No delete endpoint or Firestore TTL policy is claimed. Before household deletion is enabled, it must enumerate and delete all nested household subcollections (Firestore parent deletion alone is insufficient), clean up any private media and managed provider references, revoke preference recall immediately, and report provider deletion as pending until verified. Idempotency retention must exceed the documented client retry window. No personal transcript or photo is currently stored by this API.

`firestore.indexes.json` contains no composite indexes because the current scoped reads use Firestore's automatic single-field indexes. Add a composite index only when an actual query requires it; never use an unscoped collection-group query to infer access.

## Routes

- `GET /api/v1/health` — liveness only.
- `GET /api/v1/kitchen` — current household observations.
- `POST /api/v1/facts/confirm` — atomic confirmation.
- `POST /api/v1/outcomes` — atomic owner-reported outcome and eligible stock adjustment.
- `GET|POST /api/v1/shopping` — scoped list read and versioned entry command.
- `POST /api/v1/assistant/turns` — strict bounded input; explicit unavailable response until real managed services are connected.

All routes except root, docs and liveness require Firebase identity and an active explicit household membership. The anonymous browser demo should not call this API.

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
- A Starlette TestClient deprecation warning appeared because its installed version recommends `httpx2`; it did not affect these observed responses.

Membership resolution, transaction retries/conflicts, Firebase identity with real credentials, Firestore rules deployment, managed assistant access, media authorization, deletion, and cloud behavior remain unverified. The billing-deferred environment has not been provisioned by this work.
