# Owner-private sharing and activity API

Local implementation note · 16 October 2026

## Routes

- `GET /api/v1/share-logs?limit=25&cursor=…` returns at most 100 logs created by the authenticated member.
- `POST /api/v1/share-logs` records an owner-reported `OFFERED` state. The request includes a unique share ID, item ID/version, recipient label, optional amount/unit and measurement basis, timestamp, and explicit food condition.
- `PATCH /api/v1/share-logs/{share_id}` records one allowed transition: `OFFERED → ACCEPTED`, `OFFERED → CANCELLED`, `ACCEPTED → HANDED_OVER`, or `ACCEPTED → CANCELLED`. Transition payloads carry the share base version and idempotency key. Handover also requires the expected item version and its optional observed amount/unit.
- `GET /api/v1/activity?limit=25&cursor=…` returns bounded owner-recorded outcome events with amount, unit, and `MEASURED`, `USER_ESTIMATED`, or `UNKNOWN` basis. It does not compute savings, combine incompatible units, or include private recipient labels.

Every state is owner-reported. `ACCEPTED` is not recipient-verified, and the API does not contact recipients or dispatch food.

All routes require a verified Firebase identity, explicit active household membership, and server-generated request IDs. Writes recheck membership in the Firestore transaction. Share records live under `households/{householdId}/share_logs/{shareId}` and include `owner_uid`; reads filter by that UID, and transitions require the same owner. Household food facts may be shared by any active household member, but that member's recipient label and share history stay private. Idempotency records are actor-scoped and return only the corresponding actor's stored result.

## State, eligibility, and stock

The create request records a user-reported condition. Only `UNSERVED_USER_REPORTED` can be offered; `PLATED`, `SPOILED`, `EXPIRED`, and `UNKNOWN` are rejected. Handover requires a fresh owner-reported condition again. This field is not a food-safety certification. Freshness is explicitly stored as `UNKNOWN`. A known `USE_BY` or `EXPIRY` date is checked at offer and handover against the household's validated IANA `time_zone`. Missing/invalid household timezone requires reconciliation; no caller-selected or server-default timezone is used. `BEST_BEFORE` is not treated as an expiry date.

Offer and acceptance do not change stock or create outcome events. Only an accepted share can transition to handover. That transaction rechecks the owner, household membership, share version, item version, condition/date eligibility and outcome identity; it appends one `HANDED_OVER` outcome and updates the item atomically. A known handover amount reduces stock only when its unit matches and the remaining quantity is nonnegative. If handover amount is unknown while stock is known, the stock amount and unit become unknown to avoid retaining a false balance. A repeated command with the same actor/key/payload returns its original result; a different payload, stale version, duplicate event or invalid transition conflicts. Cancellation has no stock effect.

Generic `POST /api/v1/outcomes` rejects `HANDED_OVER`, so callers cannot bypass share eligibility. Reversals remain unsupported. Outcome event time must follow the latest observed item event and be no more than five minutes ahead of server time.

## Storage and verification limits

Owner-filtered timelines require Firestore composite indexes on `(owner_uid ASC, updated_at DESC)` for `share_logs` and `(recorded_by ASC, recorded_at DESC)` for `outcomes`. The integrator added these declarations to `firestore.indexes.json`; deployment/live query proof remains open. The document-ID tiebreaker follows the last sort direction, as described in the [Firestore index documentation](https://firebase.google.com/docs/firestore/query-data/index-overview#default_ordering_and_the_name_field). Cursor tokens identify the last page document; each read verifies that document belongs to the requesting owner before applying it as a cursor. Pages are capped at 100.

The backend pins the IANA `tzdata` package so timezone validation works on Windows and slim Linux images without relying on host timezone files.

This is local code only. No live Firestore transaction, Firebase identity, deployed index, Cloud Run service or real household timezone configuration has been exercised. The checks recorded with the implementation distinguish schema/OpenAPI and mocked in-process smoke evidence from service proof. No unit tests or test dependencies were added or run; no paid calls, provisioning, deployment, or live database writes occurred.
