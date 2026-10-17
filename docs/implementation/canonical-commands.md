# Canonical Kitchen and Shopping commands

`CanonicalCommandControls` is an opt-in, separate account feature. Its caller passes the authenticated `getIdToken` function, the explicitly selected household ID, a server-configured `enabled` flag, and an `onCommitted` callback. The caller must key/remount it when the signed-in actor or household scope changes; requests are aborted on unmount and records/pending commands stay inside that scope. When disabled or missing a valid household scope, controls explain that writes are unavailable and issue no API request. This component never imports the synthetic demo store.

## Commands

The browser exposes two POST operations only:

| Resource | Schema | Success result |
| --- | --- | --- |
| `POST /api/v1/facts/confirm` | `{ schema_version: 1, idempotency_key, observations: [{ item_id, base_version, name, amount, unit, date_value, date_type, date_source, storage, source: "USER" }] }` | `{ schema_version: 1, request_id, result: { observations: [{ item_id, version }], confirmed_at } }` |
| `POST /api/v1/shopping` | `{ schema_version: 1, idempotency_key, entry: { entry_id, base_version, item_name, desired_amount, unit } }` | `{ schema_version: 1, request_id, result: { entry_id, version } }` |

Both use the shared canonical transport's fixed route/method allowlist with a Firebase bearer token and explicit `X-Household-ID`. Reads reuse the shared canonical list parser and record types. Kitchen creation uses version 0 and a generated opaque item ID; edits select an existing record from a Kitchen read and carry its version. Shopping creation uses version 0 and an opaque entry ID; edits select an existing entry from a Shopping read and carry its version. Neither flow infers a purchase or changes kitchen quantity through a shopping command.

## Review, retry, and conflict behavior

Each form validates server bounds before review: opaque IDs, nonnegative integer base version, trimmed 1–120 character name, finite positive amount no greater than 1,000,000, paired amount/unit, valid unit characters/length, and supported date rules. A missing date is submitted as `UNKNOWN`; a known date must be a real date with a non-unknown type and `date_source: "USER"`. No date is treated as a safety judgment.

Review creates one immutable pending payload with a unique idempotency key and displays the exact command facts, version and key. A separate confirmation click sends it once. Inputs stay locked while pending. If the response or returned success body is ambiguous, the user may retry the same payload and same key; there is no automatic mutation retry. To edit, the user must explicitly discard the command and reload current records first. A 409 disables retry and requires a current read followed by a new review. An acknowledged success validates its request ID and saved version, clears pending state, displays a confirmation, and calls `onCommitted`. Read and write failures clear displayed records while keeping an unresolved command and its key available for reconciliation.

The UI does not offer outcome recording, shopping purchase confirmation, sharing mutations or stock decrement controls. Auth, membership and concurrency remain enforced by FastAPI on every request; client validation is not an authority boundary.

## Verification boundaries

No real credentials, authentication session, household membership, Firestore write or live API call was used for implementation checks. After shared transport integration, use local TypeScript/lint/build and an offline/manual review of disabled controls, form validation, payload preview, exact retry preservation, conflict reread and success handling. No unit tests or test dependencies are added. Local checks do not prove the live Firebase identity, membership, CORS or Firestore behavior.
