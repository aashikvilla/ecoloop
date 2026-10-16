# Owner-private sharing controls

`ShareControls` adds explicit, authenticated owner records for the sharing lifecycle. The parent supplies a memoized token provider, household ID, owner UID, the default-off enablement flag, and a refresh callback. Reads are user-initiated and request current Kitchen records plus at most 25 owner-filtered share records; malformed or failed reads clear the displayed private lists.

An offer requires a selected current kitchen record, an intended-recipient label, a local happened-at time, and an owner confirmation that the food is unserved. Amount and unit must be entered together; a known amount requires a measured or user-estimated basis, and a known stock quantity is checked for matching units and a non-excess amount. Freshness remains `UNKNOWN`. The user reviews the full command before sending. Offers and later acceptance/cancellation/expiry never decrement stock or contact another person.

Each write is built once with a fixed idempotency key and event time. An ambiguous response, including an invalid success response, offers an exact retry or a reload to reconcile; it never retries automatically. A version conflict requires reloading both lists and preparing a new command. Other rejected commands cannot be retried without review.

Preparing a handover performs a fresh Kitchen read for the linked item. The owner confirms the item is still reported unserved, enters the actual happened-at time, and records an optional actual amount with a matching unit and explicit measurement basis. The exact share and item versions are reviewed before submission. A successful known-quantity handover can reduce a known stock balance; an unknown handover amount clears a previously known balance. If current stock is already unknown, the UI keeps it unknown. Server-side eligibility, membership, event-time, and optimistic-version checks remain authoritative.

The controls label all share states as owner reported; ACCEPTED is explicitly not recipient verified. No contact, dispatch, public listing, safety certification, aggregate, savings claim, demo-store write, or telemetry is included. The component relies on the parent to key it by actor and household; scope changes and unmounts abort active requests, and stale-scope private records are hidden.

## Verification

No unit tests or dependencies were added. This lane uses local type/lint checks and inline command serializer/result-parser checks only. No live identity, API, database, or deployment calls are part of this implementation.
