# Local demo acceptance — 16 October 2026

Reviewer: root integrator. Initial application checkpoint: `94a292c`; final follow-up checkpoint: `1be5345`. Production Next.js server at `http://127.0.0.1:3002`; headless Chrome, 360×800 and 1440×1000. Synthetic browser data only. This record proves local interactions; it does not prove Firebase, deployed authorization, Gemini, managed Sessions/Memory Bank, or food safety.

## Observed checks

- [x] Production Turbopack build: compiled, TypeScript finished, 13/13 generated pages; dynamic item/share routes prerender their shell and stream dynamic content.
- [x] Installed ESLint over `src`: exit 0, no warnings.
- [x] Manual draft `Demo carrots`, 4 pieces: review displayed an unconfirmed candidate; inventory remained at four seed items before save. Explicit confirmation added the fifth item.
- [x] Item keyboard navigation and recorded use: using 1 piece changed 4 → 3; version advanced to 2.
- [x] Private sharing: offer kept stock 3; accepted kept stock 3; confirmed handover changed stock to 2 and entered terminal `handed_over`. No recipient was contacted.
- [x] Ask: saved a plan for 2 people and an explicitly consented local preference. Browser state contained the expected values; UI labeled its scripted sample and absence of managed memory.
- [x] Shop: added `Demo lentils`, 500 g; checked it using the keyboard; reload retained `checked: true`. No purchase or stock intake was inferred.
- [x] Activity route rendered recorded events. Home and Settings rendered current browser data.
- [x] Reset dialog opened; Escape dismissed it and retained all five items.
- [x] Missing item route displayed `Item not found` with recovery navigation.
- [x] Photo mode explicitly reported extraction unavailable and offered manual entry. Manual entry with unknown amount reached review with null amount/unit. No image upload or AI call was made.
- [x] Production browser error collection was empty at the end of the flows.
- [x] Final integrated `1be5345` production build/TypeScript generated 13/13 pages again; full-src ESLint exited 0 without warnings. Reloaded saved item initialized the correction unit to `pieces`. Discard requested explicit confirmation and left stock at 2; cancelling retained stock at 2. Reset Escape returned focus to `Reset this demo`. Refreshed final Home screenshots and browser error collection was empty.
- [x] Inspected mobile Home, Kitchen and review screenshots plus desktop Ask/Shop. Measured document widths 345 at viewport 360 and 1425 at viewport 1440: no horizontal overflow in these samples. This is a sampled visual/keyboard review, not a complete accessibility audit.

The browser CLI's coordinate clicks did not consistently activate offscreen/sticky-header targets. Focus + Enter/Space was used for reliable native keyboard activation. The first capture was submitted via browser `requestSubmit`; a second manual capture reached review through native keyboard submission. No unit tests were added or run.

## Screenshots

- [Mobile Home](home-mobile.png), [desktop Home](home-desktop.png)
- [Mobile Kitchen](kitchen-mobile.png), [mobile review confirmation](review-mobile.png)
- [Mobile share history](share-mobile.png)
- [Desktop Ask](ask-desktop.png), [desktop Shop](shop-desktop.png), [desktop Activity](activity-desktop.png)

Full-page browser captures place sticky/fixed navigation at the current scroll offset; this explains their position within tall captures.
Home images show the final follow-up; other images document the initial integrated flow before the accessibility/refinement pass.

## Remaining proof and implementation

- [ ] Connect frontend to real Firebase identity and canonical API; prove membership/tenant denial with real credentials and scoped database transactions.
- [ ] Finalize retention/deletion and implement media authorization, distributed rate limits, retries and conflict recovery against managed services.
- [ ] Connect real Gemini extraction, ADK, managed Sessions and consented Memory Bank; prove typed outputs and memory deletion.
- [ ] Enable owner-reviewed billing, configure the requested $10 notification budget, deploy the single environment and run deployed whole-flow acceptance.
- [ ] Review every Stitch state and accessibility behavior in the deployed app; these sampled checks do not close full phase gates.

Backend checks and limitations are recorded separately in [backend foundation](../../implementation/backend-foundation.md).

## Run locally

From `frontend`, install locked dependencies with `npm ci`, then `npm run build` and `npm run start -- --port 3002`. Open `http://localhost:3002`. For development use `npm run dev`; stop the development server before rebuilding its shared `.next` output. Browser demo storage is origin-specific. Settings provides a confirmed reset.
