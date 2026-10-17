# Phase 1 local donor flow fixes — 18 October 2026

## Scope and boundaries

Continued the Phase 1 donor-flow review requested by the owner. No emulator was used. The local frontend and API target the existing Firebase project `ecoloop-staging-20261015`; no deployment, commit, Cloud Run write or live task-sheet update was performed. Only synthetic browser account/household/listing data was used. Existing work on `main` was already uncommitted at session start.

## Changes

- The request-size middleware now grants the 2 MB bound to offer media routes as well as intake photos and includes configured CORS headers in early 400/413 responses.
- Offer media upload returns the incremented offer version. The frontend carries that version forward. Manual drafts are saved before publish checks their ID; the publish request uses the returned version.
- The wizard presents Google AI observations and a visible manual fallback/error state, rejects files larger than 2,000,000 bytes locally, and edits drafts/open unreserved offers.
- Location/address/instruction fields start blank; no false pickup location is seeded. Local datetime fields are timezone-correct. Pickup end must be no later than donor-declared expiry in the browser and backend.
- Offer cancellation requires a meaningful reason. Offers navigation is present in the mobile shell.
- Kitchen item detail now offers contextual meal advice by passing the item ID into Ask, plus a separate offer creation entry. Donor declarations remain a user-reviewed action.

## Kitchen item to offer prefill follow-up

- The Kitchen item action now opens `/offers/new?item=<item_id>`. The offer wizard re-reads that ID through the authenticated canonical Kitchen API for the active household; the ID alone is never treated as item data.
- It pre-populates the confirmed name and copies quantity only for a positive integer whose unit exactly matches the offer units (`g`, `ml`, `portion`, `package`, `item`). Unsupported or unknown quantity stays blank. The donor profile is bound to the household, with business selection disabled while the household item prefill is active.
- The wizard displays the source date, amount, and storage note and explains that a date without a time is not converted to an expiry timestamp. Category remains `Other` until donor selection; storage declaration and allergens start unknown; safety is labeled not assessed. Offer details remain editable and publish still requires the donor's declarations.
- Browser acceptance used synthetic record `food-2d05ffb6-8116-44a8-b486-3f94f6b220d0` (`Synthetic prefill strawberries`, `12 item`, storage note `Refrigerated`, date unknown) in household `e1fe0aa07a9d45b7b45df011c9112927`. Opening the Kitchen item action showed the correct source record, and the wizard showed the same title, quantity and exact unit while keeping category, storage declaration, allergens and expiry unasserted.

## Verification

- Browser/API evidence already captured in [the initial browser validation](2026-10-18-phase1-browser-validation.md): synthetic manual draft creation, publish, edit, list/detail readback and cancellation succeeded; synthetic image upload/observation ran against the live Firebase project through the local API. Both synthetic offers were cancelled.
- Follow-up browser verification initially found the form retained a donor-declared expiry of 18 October 2026 04:00 local time, pickup ending at 03:30, an explicit donor confirmation and synthetic pickup details, but the publish attempt did not reach the API. Inspecting the fields showed longitude was blank, although the UI requires both coordinates. After entering explicitly synthetic coordinates `(0, 0)`, the browser completed `POST /offers` (201), `PATCH /offers/{id}` (200), `POST /publish` (200), and detail readback (200). Detail showed status OPEN, available 5 portions, expiry 04:00 and pickup window 02:25–03:30 local. Browser cancellation then returned CANCELLED, version 4, available 0. Offer: `gVp5M9U3dkgs2VCV7Zwe`.
- `frontend`: `npm run lint` passed; `npx tsc --noEmit` passed.
- `backend`: `.venv/Scripts/python.exe -m compileall -q app` passed.
- `git diff --check` passed (Git emitted only line-ending normalization notices).
- No unit tests, production build or live acceptance script was run. AGENTS.md prohibits unit tests; browser acceptance is still incomplete.

## Open gates

- G1 remains open until business donor flow and AC1-01–AC1-09 are accepted on a coordinated deployed revision. The household near-expiry publish/cancel journey passed locally. Local changes are not deployed.
- Vendor-to-vendor recipient sharing is out of scope by owner direction; Phase 1 recipient scope remains approved organizations.
- Revisit a sustainability score after Phase 2 verifies recipient receipt and an impact basis is agreed. Until then, keep offered and verified recovery quantities distinct and show no composite score or unsupported savings claim.
- Synthetic Firebase households: `e1b34f1f92e14a799c3d0ab290ce4290` (offer flow) and `e1fe0aa07a9d45b7b45df011c9112927` (item prefill). Synthetic Kitchen item `food-2d05ffb6-8116-44a8-b486-3f94f6b220d0`. Cancelled offers `Oa060WQ0YvZfQ0vzBnvC`, `XCugaWdIMjVpIPZzvIFj` and `gVp5M9U3dkgs2VCV7Zwe`. A private synthetic photo object remains attached to the cancelled second offer, with analysis metadata. No live data was deleted.
- The browser task is left on the local near-expiry offer review screen; services should be stopped after any remaining inspection. Do not clean up the synthetic account or media without an explicit targeted cleanup request.

Current pointers: [implementation record](../../implementation/social-impact-phase1.md), [status snapshot](../../STATUS.md), [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md), [past mistakes](../PAST_MISTAKES.md). The live MVPTasks Sheet remains authoritative and was not changed.
