# Upstream Maps autocomplete fix — 18 October 2026

## Source review

- Fetched `https://github.com/sudikhya/ecoloop`. Its default `feature/collector-screen` branch ends at `05eb537`; both commits unique to that branch have patch-equivalents in this repository.
- Its `main` ends at `4c63049`; the latest code commit is `0a44a5d` (`fix: use Maps suggestions in NGO planner`). The newest commit is documentation-only. The broader remote branch also contains a large, independently diverged surplus-recovery implementation and a deployment workflow for another GCP project; neither was imported.

## Change and verification

- Cherry-picked `0a44a5d` onto local `main` as `1c56006`. The shared address input now uses debounced Google Places suggestions, keyboard navigation, and selected-place coordinates.
- Resolved the loader integration conflict by extracting the existing Google Maps loader to `frontend/src/lib/google-maps-loader.ts`; the recipient map now imports that shared module instead of importing a UI component.
- `pnpm exec tsc --noEmit` and `pnpm lint` passed. No unit tests were run and no live Maps query or database mutation was made.
- The commit has not been pushed or deployed. No new Past Mistakes entry is needed; no user task sheet was updated.
