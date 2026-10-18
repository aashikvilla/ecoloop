# Final demo flow implementation — 18 October 2026

## Scope and branch

Implemented the authorized D1–D4 demo improvements on `feature/bengaluru-ai-recovery-demo`. This is a local source branch; no commit, merge, deployment, cloud setting change, or task-sheet update was made. The README credentials are synthetic public demo credentials as explicitly requested. No real household or donor data was entered.

## Source changes

- **D1:** Added an authenticated transient Gemini product-photo candidate endpoint and Shop photo check. The candidate can be corrected before a canonical Kitchen read; deterministic exact normalized identity matching only recommends skipping a purchase when one matching confirmed item has positive known quantity.
- **D2:** Added Home `Needs attention` cards from recorded dates within seven days, preserving `USER_TARGET` as a reminder label. Added contextual meal prompts and separated confirmed Kitchen ingredients from unconfirmed ingredients in proposal cards.
- **D3:** Added `Not cooking this?` from a contextual meal suggestion and a Kitchen-linked offer wizard. Offer publication checks item/version/quantity/unit/date facts and requires donor condition/storage declarations; it does not infer food safety.
- **D4:** Added structured item, amount/unit, dietary tag, radius, deadline and Maps-origin inputs. Deterministic matching presents up to two quantity/coverage options. Backend revalidates selected stops and donor declarations; reservation applies existing transactional stock/claim updates.
- Updated README credentials/data status, this branch's implementation snapshot, and the remediation gates.

## Prepared synthetic account data

Created `donor.vasanth@ecoloop.example` through the Firebase email sign-up screen. Created private household `EcoLoop Donor Vasanth Nagar Home` (`359d769ffd334fa39f6dfb2dd63690ac`) through the authenticated household flow. Confirmed one Kitchen record through the intake candidate and explicit review path: Baby spinach, 250 g, fridge, `USER_TARGET` 20 October 2026; observation confirmed 18 October 2026. The shared credential is documented in README.

Reviewed the Kitchen-prefilled surplus offer wizard. No public offer was published: no physical surplus food was available for the required donor inspection/suitability declaration. The consumer and NGO accounts and the original consumer Kitchen data remain documented in README. This does not complete the requested six-account/12-offer pickup fixture. Do not place synthetic records that imply donor inspection or actual recipient availability into operational discovery/reservation without an explicit simulation boundary.

## Verification

- `pnpm lint` — passed.
- `pnpm exec tsc --noEmit` — passed.
- `backend/.venv/Scripts/python.exe -m compileall -q app` — passed.
- Browser acceptance: created donor account and household, read back the empty Kitchen, captured a candidate, reviewed and confirmed the spinach observation, read it back from Kitchen, opened the contextual item page and verified the offer wizard prefilled canonical amount/date/storage facts. No offer publish occurred.
- Browser Ask attempt returned the app's unavailable state. Local backend `/api/v1/health` was healthy but reported assistant `enabled: false`. The deployed assistant's earlier 504 remains unresolved; no live D1/D2 Gemini turn was accepted.
- No Google Routes timing was returned; local configuration has no Routes key. D4 currently uses structured inputs and approximate straight-line distances, not Gemini natural-language parsing or driving-time route optimization.
- No new claim/receipt was created. Existing D5 transaction and idempotency flow was not exercised for retry/concurrent claim acceptance on this branch.
- `pnpm build` — passed, including optimized compilation, TypeScript validation and static page generation. `git diff --check` — passed.
- No unit tests were run or added, consistent with project instructions.

## Remaining demo gates

1. Diagnose and fix the managed ADK/Cloud Run timeout; verify a bounded authenticated turn without duplicate or partial persistence.
2. Enable the approved AI runtime for local/demo verification; accept D1 photo identification, exact pantry citation, no-match/ambiguous cases, and D2 grounded meal suggestions.
3. Add Gemini natural-language request parsing for organizations, including a clarification or explicitly labeled portion assumption for requests like “30 people.” Keep deterministic eligibility and quantities authoritative.
4. Resolve the demo data boundary for simulated donor offers. If real surplus is used, obtain an actual donor's explicit condition/storage declaration; if synthetic inventory is used, prevent the fixture from implying real recipient-available food or enabling operational claims.
5. Configure and verify an actual Google Routes response before describing stop order or duration as calculated driving routes.
6. Use isolated authorized data to verify two meaningful plan alternatives, explicit selection/reservation, concurrency limits, retry idempotency, collection and confirmed receipt.
7. Only after those gates, create/document the remaining donor identities and eligible offers needed for the six-account Bengaluru fixture.

Current pointers: [architecture](../ARCHITECTURE.md), [past mistakes](../PAST_MISTAKES.md), [decisions](../DECISIONS.md), [demo remediation plan](../../planning/DEMO_FLOW_REMEDIATION_PLAN.md), and [README](../../../README.md).
