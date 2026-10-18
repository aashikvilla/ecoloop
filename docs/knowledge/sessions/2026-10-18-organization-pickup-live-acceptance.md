# Organization pickup live acceptance — 18 October 2026

## Scope and environment

The owner authorized live Firebase database updates and direct testing during development. The app's configured Firebase project is `ecoloop-staging-20261015` (the only project configured for this workspace). No application deployment or live MVPTasks Sheet update was made.

Created or retained only synthetic demo data:

- Organization account `ngo.demo@ecoloop.example`, profile `EcoLoop Demo NGO`, profile complete, public pickup base selected from Google Places for Bengaluru, 5 km radius.
- Consumer account `consumer.demo@ecoloop.example` and household `ecoloop-consumer-demo-household`, marked synthetic. The normal household-create button is disabled by the local command gate, so the household and active owner membership were seeded directly through Firebase Admin for the requested donor journey.
- Two donor offers from that household: produce (`kmLt3SkYfaP1HwYzA0eR`, 10 portions) and bakery (`Y4i0k8iwTmhvPddYKePv`, 8 portions). Both are labelled synthetic and use demo pickup text/coordinates.
- One saved two-stop plan. Both reservations and receipt records are intentionally retained for development/demo access.

The account values are held locally in ignored `backend/.env`; the owner later explicitly authorized publishing these shared demo-only credentials in the root `README.md` for reviewers. They are intended only for the configured development Firebase project and must not be reused elsewhere.

## Browser journey

Completed with the local browser and Firebase-backed API:

1. Created and signed into the NGO account; saved the organization profile without admin approval.
2. Located both offers in the list within 5 km, confirmed coarse locations, pickup windows and declared uncertainty. The Google map rendered both markers after fixing the `LatLngBounds` library import.
3. Selected both offers, set a 20-portion target, revised the selection to 9 + 8 portions, saw 17/20 coverage with a 3-portion gap, and saved the plan.
4. Reserved both stops. The active collection showed the exact synthetic addresses and instructions only after reservation.
5. Built a two-stop route in order and return-to-base links. No Google Routes key is configured, so the UI truthfully labels route timing unavailable; ordered per-stop Google Maps direction links remain available.
6. Recorded produce as 9 offered, 8 collected, 7 received, with shortage notes. Recorded bakery as 8 offered, 8 collected, 7 received, with a receipt shortage note.
7. NGO impact showed 2 receipt records and 14 portions received. Direct authenticated API readback returned one `COMPLETED` plan, two `RECEIVED` claims and two receipt records totalling 14.
8. Signed into the consumer donor account. The household offer list showed 18 portions offered, 2 available, produce `2/10` available and bakery closed after its reservation. Donor offer detail showed produce `9 offered / 8 collected / 7 received`, sourced from recipient-confirmed receipt records.

## Database and checks

- Firestore composite index inspection: all 13 configured indexes are `READY`.
- Live offer records and receipt ledger were read back from the configured Firebase project. No unrelated records were changed.
- The authenticated browser exposed an existing map UX defect: a wrong Google library lookup silently switched to List. Fixed `LatLngBounds` to import from Maps `core`, added the shared loader type, and kept a clear visible failure fallback. Map browser check then showed both offer markers.
- Next.js runtime diagnostics showed only the pre-existing development instant-navigation validator errors for the protected organization/personal layouts; no map runtime or compilation error remained after the fix.
- `backend/.venv/Scripts/python.exe -m compileall -q app`, `git diff --check`, `pnpm lint`, and `pnpm exec tsc --noEmit` passed after the map fix. No frontend/backend unit tests were added or run.

## Remaining limits

- Google Routes timing/optimization is unverified because the backend Routes key is unset. The app provides ordered stop directions and base-return directions without fabricated ETA.
- This is local browser acceptance against the configured live Firebase project, not deployment acceptance. No app service was deployed.
- Household creation remains disabled by the local commands feature gate; the synthetic consumer membership was seeded directly for donor-side acceptance.
- Profile completion grants current recipient access while `verification_status` remains distinct from profile completion.

## References

- [Organization pickup scope and acceptance plan](../../planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md)
- [Architecture](../ARCHITECTURE.md)
- [Decision](../DECISIONS.md#simplified-recipient-pickup-scope--2026-10-18)
- [Implementation journal](2026-10-18-organization-pickup-implementation.md)
