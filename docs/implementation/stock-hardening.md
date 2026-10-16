# Canonical stock hardening

## Behavior

- Share eligibility now validates every persisted date type and its date value before allowing an offer or handover. `UNKNOWN` must have no date; known date types must have a canonical, valid `YYYY-MM-DD` date. A malformed, missing, or inconsistent stored date returns `DATE_RECONCILIATION_REQUIRED`. `USE_BY` and `EXPIRY` still use the verified household time zone for deterministic expiry rejection. `BEST_BEFORE` remains a date observation and is not treated as an expiry or safety assertion.
- A quantity-changing `USED`, `DISCARDED`, or `COMPOSTED` outcome with unknown quantity clears the previously known amount and unit. The item remains explicitly unknown until the owner reconciles it. `STORED` does not change quantity.
- Measured reductions no longer round to six decimal places. A valid positive remainder below one micro-unit stays positive for both generic outcomes and owner-confirmed share handovers.

## Evidence

Checked with `uv run --locked python -m compileall -q app` and an inline Python fake-store transaction smoke. The fake-store smoke exercised a measured small-quantity generic outcome, an unknown-quantity stock-changing outcome, a small-quantity share handover with a single share outcome, and rejection of a malformed stored date type. All assertions passed.

These checks ran against an in-memory fake Firestore adapter. They validate the transaction callbacks and domain behavior locally; they do not prove live Firestore transaction retries, deployed service behavior, or production data compatibility. No live service or database was accessed.
