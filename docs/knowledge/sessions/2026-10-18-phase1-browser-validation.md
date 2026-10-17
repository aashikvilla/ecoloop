# Phase 1 donor flow browser validation — 18 October 2026

## Scope and environment

The owner asked for browser validation of the Phase 1 donor-offer journey, including a near-expiry scenario, photo upload/analysis, publishing, cancellation, offer history, and sustainability reporting. No emulators were used. No code changes or deployment were made. Existing local Phase 1 files were uncommitted on `main`.

Cloud Run inspection showed that web revision `ecoloop-web-00010-dup` received 100% traffic. `ecoloop-web-00014-geq` was the latest ready revision but had a tag and no traffic. The local Phase 1 UI was therefore run in a browser. A first pass through the deployed API confirmed that the media and cancel routes were missing there. For a second pass, the local Phase 1 API used the live Firebase project `ecoloop-staging-20261015`, a local 2 MB request limit, localhost CORS, Vertex photo analysis enabled, and one synthetic image. No emulator or real food/personal photo was used.

## Browser journey findings

- A synthetic Firebase user created a household through the canonical household API. The account route showed a single shared email sign-in flow followed by separate household setup; these are not duplicate login screens.
- At the default mobile viewport, the fixed navigation showed only Home, Kitchen, Ask, and Shop. Offerings appeared in the desktop sidebar only. Kitchen had no contextual “make a meal” or “offer this item” action; existing item routes support meal advice and a private owner-reported share log, not a public donor offer.
- The donor wizard allows a standalone offer and has manual fallback, declaration, pickup, privacy preview, and explicit publish confirmation. Exact pickup address is kept out of the pre-claim preview.
- The UI advertised photo files up to 2 MB. A 284 KB synthetic photo was rejected by the deployed API with HTTP 413 because `MAX_REQUEST_BYTES` defaults to 256,000 bytes and the request middleware gives the 2 MB exception only to `/intakes/photo`. A smaller 13 KB photo reached the deployed API but the Phase 1 media route returned 404.
- The local API accepted the 284 KB photo and returned Gemini analysis with `analysis_state=FAILED`, `ai_provider=null`, no detected food/title, and uncertainty `AI analysis timed out or failed (ClientError). Please fill details manually.` The UI rendered an empty “Observation Draft” badge but did not display that uncertainty or explain that analysis failed.
- Local upload increments the offer version in Firestore, but the upload response has no version and the frontend keeps `draftVersion` at 1. The subsequent `PATCH` returned HTTP 409 (“The offer changed. Reload it before editing.”); the wizard provides no reload/reconciliation path, so the photo path could not publish.
- The no-photo/manual path reached the review page but publish returned “Draft could not be found. Please retry.” `handlePublish` checks `draftId` before calling `saveDraft`, while that path does not create a draft until `saveDraft` runs. This path cannot publish as written.
- Offer detail exposed cancellation but no edit action. Cancellation worked against the local Phase 1 API and the list showed the resulting cancelled history. No live offer remained open.
- History showed counts by offered/available state, but not a sustainability score. Existing architecture intentionally avoids composite scores or claims of waste prevented/environmental savings. Report declared offer amounts and later observed/verified quantities separately, by compatible units; do not claim recipient receipt until Phase 2 verifies it.

## Synthetic live data left for targeted cleanup

The requested Firebase scenario created one synthetic Auth user and household and two offers. Both offers were cancelled; no synthetic listing remains open. One 284 KB synthetic image is stored in the private offer-media bucket and remains attached to the cancelled offer. The manual no-photo attempt did not create another offer. No account or Firestore data were deleted during this pass.

- Synthetic household: `e15c28db5120496987acb02dc5b84dc7`
- Cancelled offers: `A5RuUCw9BbH5iUT9Lo2U` and `naoW1sQxqcgXiF2sLtVP`
- Stored synthetic media: `530ec873d986487ead7b39c2386c4a35` on the second offer

These exact references allow the owner to request a targeted cleanup. The cancellation API did not delete private media; permanent deletion of the synthetic account, household, and object was not performed.

## Progress and next steps

G1 is not accepted from this browser pass. Do not merge/deploy this implementation yet. First fix the photo request limit, version reconciliation, manual draft creation, visible AI fallback state, mobile entry point, and edit path; then run AC1-01–AC1-09 against a coordinated Phase 1 frontend/backend revision. The live MVPTasks Sheet was not changed in this session and remains authoritative.

Current pointers: [Phase 1 implementation record](../../implementation/social-impact-phase1.md), [status snapshot](../../STATUS.md), [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md).
