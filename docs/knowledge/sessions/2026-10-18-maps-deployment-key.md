# Google Maps key deployment wiring — 18 Oct 2026

## Request

The owner added the Maps browser key to local `frontend/.env.local` and asked to wire deployment variables, test locally, and merge to `main` only if the result is good. The real environment file was not opened or copied.

## Changes

- Passed `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` as a frontend Docker build argument and build environment variable so Next.js can inline it into client code.
- Added the Cloud Build substitution `_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Updated `.github/workflows/deploy-main.yml` to read the repository Actions variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, fail before image build if it is missing, and pass it to Docker.
- Updated setup and deployment documentation. The key is public browser configuration, so it belongs in GitHub Actions Variables and must have Maps JavaScript API / Places API (New) and allowed-origin restrictions.

## Verification

- Frontend lint, `next typegen`, `tsc --noEmit`, production build — passed.
- The production client bundle contains the Maps loader URL with a non-empty key; only a boolean was printed, and no key value was exposed.
- GitHub repository variable existence was verified by listing variable names only; the value was not displayed.
- Browser check against the local app loaded Google Places suggestions for `Seattle`; keyboard selection returned the formatted address, latitude, longitude, and place ID.
- Visual inspection found the widget dropdown using a dark color scheme against the light page. Setting `color-scheme: light` on the Places custom element fixed the contrast, and the dropdown was rechecked in the browser.
- `git diff --check` — passed.

No live account was used. The Places widget was verified through a temporary local preview route, which was removed after the check. No unit tests were added or run per project instructions.

## Merge status

The GitHub Actions repository variable exists. The deploy workflow now stops before building if it is empty. A push would trigger the existing main-branch deployment workflow, so this verification does not push or deploy. Local merge readiness is being handled after final checks.
