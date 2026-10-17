# Kitchen item to donor offer prefill — 18 October 2026

## Owner direction

Add a direct Kitchen item → donor offer path that pre-fills the offer from the selected item. The owner confirmed sustainability scoring can be revisited after Phase 2 receipt verification and said vendor-to-vendor sharing is out of scope. The private synthetic photo and cancelled-offer data from prior acceptance were accepted as harmless and left in place.

## Implementation

- Kitchen detail links to `/offers/new?item=<item_id>`.
- The browser passes only an item ID. The wizard fetches canonical Kitchen records again through the authenticated API, scoped to the currently selected household, and requires household donor scope while prefill is active.
- The title is prefilled. Quantity is copied only when it is a positive integer and its unit exactly matches the offer contract. Unknown, fractional, zero, or incompatible quantities remain blank. The record date is shown for donor review but a date-only value does not become an expiry timestamp. Category remains generic for explicit donor choice; storage and allergens start unknown; safety stays not assessed.
- Offer fields remain editable and the existing publish declaration flow still requires donor review. This prefill creates no offer draft until the normal save/publish action and does not modify Kitchen stock.
- Added the explicit unknown storage option and household-only boundary for item-derived data. Offer create/edit routes suspend around their search-param reader.

## Browser evidence

Used a synthetic Firebase account and household `e1fe0aa07a9d45b7b45df011c9112927`, created through the existing account UI after sign-in. Added a synthetic canonical Kitchen observation `food-2d05ffb6-8116-44a8-b486-3f94f6b220d0`: name `Synthetic prefill strawberries`, amount `12 item`, storage note `Refrigerated`, date unknown. Navigated from its item detail to “Create a surplus offer.” The offer wizard displayed the same item name and amount/unit, showed the source date and storage note, marked safety not assessed, defaulted category to Other, and kept allergen and expiry declarations unknown. No offer was published from this check.

## Verification and boundaries

- `npm run lint` passed, `npx tsc --noEmit` passed, and final `git diff --check` passed (Git printed line-ending normalization notices for existing modified files).
- No unit tests or production build were run. No Cloud Run deployment, commit or task-sheet update was made.
- Sustainability score is deferred for Phase 1 and should be revisited after Phase 2 can verify recipient receipt and EcoLoop has an agreed, defensible impact basis. Until then, show offered/available and verified recovery facts distinctly; do not imply unverified savings.
- Vendor-to-vendor recipient sharing is out of scope. Phase 1 remains limited to approved recipient organizations.

Current pointers: [status snapshot](../../STATUS.md), [Phase 1 implementation record](../../implementation/social-impact-phase1.md), [decision record](../DECISIONS.md), [architecture](../ARCHITECTURE.md), and [past mistakes](../PAST_MISTAKES.md). The live MVPTasks Sheet remains authoritative and was not changed.
