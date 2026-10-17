# Canonical outcome controls

`OutcomeControls` is a separate, opt-in account feature. The caller supplies Firebase `getIdToken`, an explicitly selected household ID, the existing default-off `enabled` flag and `onCommitted`. The caller must key/remount on actor or household scope changes. The component has no demo-store dependency and sends no request while disabled. Kitchen data is loaded only after the user presses **Load current kitchen**.

## Supported command

The component allows only owner-observed `USED`, `STORED`, `DISCARDED` and `COMPOSTED`. `HANDED_OVER` remains in the eligible share-log flow. It posts the backend `RecordOutcomeCommand` shape to the fixed `POST /api/v1/outcomes` route:

```json
{
  "schema_version": 1,
  "idempotency_key": "...",
  "outcome_id": "...",
  "item_id": "...",
  "base_version": 1,
  "outcome_type": "USED",
  "amount": 1,
  "unit": "piece",
  "measurement_basis": "USER_ESTIMATED",
  "storage": null,
  "occurred_at": "2026-10-16T10:30:00.000Z"
}
```

The user chooses an actual local date and time. It is converted to an ISO UTC timestamp. It must be after the selected record's `observed_at` and no more than five minutes in the future. Amount and unit are paired; positive amounts require a `MEASURED` or `USER_ESTIMATED` basis, while unknown amounts require `UNKNOWN`. A Stored outcome requires a 1–120 character storage location and does not deduct stock. Unknown quantities are never guessed: a stock-changing outcome with unknown amount marks a previously known balance unknown, as the backend contract specifies. Known amounts are checked against the confirmed stock unit and quantity before review and again by the backend transaction.

## Confirmation and recovery

Review creates one immutable command with a unique outcome ID and idempotency key, then shows the exact payload and stock effect. Only a separate confirmation sends it. There is no automatic retry. Network, timeout, unavailable-service and malformed-success responses keep the exact command/key retryable. A 409 disables retry; the user must reload Kitchen and review a new command. Other failures clear displayed private Kitchen records while retaining the pending command for explicit discard/reconciliation. Identity or scope changes must remount the component; unmount aborts in-flight work and late token/API responses are ignored.

Success is accepted only when the response envelope, request ID, outcome ID, item ID and incremented item version match. No outcome write has been attempted against a live service during offline implementation checks. No unit tests or dependencies were added.
