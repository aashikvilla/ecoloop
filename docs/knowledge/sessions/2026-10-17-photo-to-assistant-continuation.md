# Photo confirmation to Ask — 17 October 2026

## Scope and implementation

Added a continuation from a confirmed intake to Ask with two fixed intents: recipe suggestions and a buy check. The `/ask` query carries only the allowlisted intent name; candidate IDs, candidate fields, image bytes and other private food details are not included. Ask fills a prompt for the user to review and submit. Submission uses the existing authenticated, selected-household proposal API, which reads current canonical context. Ask controls remain unavailable until sign-in and an active household are present.

The confirmed state is the only place these links render. Candidate extraction and review remain unchanged: photo-derived facts stay unconfirmed and cannot reach Ask or canonical Kitchen through this continuation.

Compared the capture and review implementation with the supplied `ecoloop_add_food_smart_capture` and `ecoloop_review_detected_food_items` PNG/HTML pairs. The local flow uses a real file/camera picker, explicit candidate review, editable supported fields, and confirmation. Prototype detection overlays, duplicate warnings, inferred quantities and safety-like alerts are not backed by this flow and were not copied.

## Verification

- `git diff --check`: passed.
- `npm ci` completed in `frontend/` from the lockfile; npm reported 9 high-severity dependency advisories.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed, including route generation for `/ask` and `/kitchen/review`.
- `npm run lint`: passed.
- No unit tests were added or run. No Firebase, Gemini, Firestore or browser acceptance calls were made.

## Evidence gaps

The authenticated photo-confirmation-to-Ask journey and live assistant context readback remain unverified in this worktree. The main branch still needs its normal cloud/browser acceptance for identity, membership, canonical writes and assistant availability.

Architecture pointer: `docs/knowledge/ARCHITECTURE.md`. Current product contract: `docs/planning/CURRENT_MVP_SPEC.md`.
