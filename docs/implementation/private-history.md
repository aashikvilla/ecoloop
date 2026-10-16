# Private history UI

## Scope

`PrivateHistory` is a read-only account component for the canonical `GET /api/v1/share-logs` and `GET /api/v1/activity` endpoints. It takes an ID-token callback, explicit household ID, and signed-in owner UID. Requests happen only after the user presses a read or pagination button; each call asks the shared canonical transport for a bounded page of 25 records, with a 500-record display cap.

The client validates the complete versioned envelope and each record before displaying a page. It checks owner and household scope on share records and every history actor, IDs, duplicate IDs, exact state/type/basis boundaries, status history transitions/version, timestamps, quantity/unit/basis pairs, bounded notes/labels/history/events, and opaque cursor shape. Unknown or malformed data withholds the page. Cursor loops and duplicate records across pages are rejected.

Requests are cancellable and abort on unmount or scope/provider changes. The active request is rechecked after token retrieval and after the API response. Page state is tagged to the household and token callback, so old-scope records are hidden immediately; the Account parent also keys this component by actor and household to discard its state on identity changes. Any failed read clears displayed records and cursors, including token-provider, auth, membership, and invalid-response failures. No tokens or household content are persisted or logged.

Share labels identify every state as owner-reported; ACCEPTED explicitly says it is not recipient-verified. Recipient labels and private notes appear only in the owner's returned share-log view. The UI has no recipient contact action. Activity renders one event at a time with its timestamp, quantity, unit, measurement basis, and source; it never sums quantities or claims savings.

## Integration and verification

This component intentionally imports `canonicalRequest` and `CanonicalApiError` from `@/lib/canonical-transport`, which is owned by the integrator. Do not add a duplicate transport here. Integration checks should confirm that the parent passes the authenticated `user.uid`, mounts it only for a signed-in identity plus selected household, and keys it by both actor and household scope.

No unit tests or test dependencies were added. Local checks: `npx tsc --noEmit`, `npm run lint`, and an inline runtime parser check using valid share/activity envelopes plus nine malformed, foreign-owner, or foreign-scope cases. No live account, API, Firestore, or browser requests were made as part of this feature work.
