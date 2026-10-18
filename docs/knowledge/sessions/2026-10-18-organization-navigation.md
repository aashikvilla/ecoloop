# Organization workspace navigation — 18 October 2026

## Changes

- Added four organization destinations: Nearby offers (`/organization`), Collection plans (`/organization/plans`), Received impact (`/organization/impact`) and Pickup profile (`/organization/profile`).
- Added a persistent desktop sidebar and mobile bottom menu following the household shell's navigation pattern. Each link exposes the current page with `aria-current`.
- Kept one `OrganizationWorkspace` mounted in the organization layout as routes change. This preserves selected offers and other local plan inputs while the operator moves between offers and plan review.
- Made the approximate pickup area directly editable. Place autocomplete remains available to fill the area and coordinates; the manual area and coordinate fields work independently.

## Browser acceptance

- Signed in using the existing NGO demo account. Its Firebase account had no recipient organization profile, so the setup screen appeared. Created `EcoLoop Demo NGO` with a synthetic Bengaluru pickup base (12.9716, 77.5946) and 5 km service radius in the configured development Firebase project.
- Nearby offers loaded one available synthetic produce offer. Added the offer to a proposed plan, navigated to Collection plans, and confirmed the selected two portions remained present.
- Navigated to Received impact and confirmed the empty state appeared for this new organization. Navigated to Pickup profile and confirmed the saved name, area, coordinates and radius loaded.
- Desktop browser screenshot confirmed the active sidebar and pickup profile form. The existing recipient collection/receipt lifecycle had passed in the prior live acceptance session; this navigation change did not submit another reservation or receipt.

## Checks

- `pnpm lint`: passed.
- `pnpm exec tsc --noEmit`: passed.
- `git diff --check`: passed, with Git line-ending normalization warnings only.
- Next.js development diagnostics reported no build or runtime error for this page; the already documented personal protected-layout instant-navigation validator issue remains.

## References

- [Organization pickup scope](../../planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md)
- [Live pickup acceptance](2026-10-18-organization-pickup-live-acceptance.md)
