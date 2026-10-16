# Separate Firebase browser connection

The `/account` route is a secondary, read-only connection to canonical household records. It does not consume or import the synthetic browser store. The demo experience continues to use only its isolated local state.

## Configuration

Copy `frontend/.env.example` to a local environment file and set the public Firebase Web App values from the existing project plus `NEXT_PUBLIC_ECOLOOP_API_ORIGIN` to the exact authorized FastAPI service origin. Configure that app origin in backend CORS as well. Firebase web config values identify a Firebase app and are public client configuration; do not put service-account credentials or private keys in these variables. Firebase Auth must have Google sign-in enabled and the current hostname authorized. This implementation does not provision either setting.

With no complete Firebase config, `/account` displays an unavailable state and does not import or initialize Firebase Auth. The API origin must be a bare HTTPS origin. HTTP is accepted only for localhost, `127.0.0.1` or `::1` development.

## Authentication and scope

The browser uses Firebase's modular Web Auth SDK with a user-initiated Google popup and browser-session persistence. The SDK owns authentication state and refresh behavior; the application never writes the ID token to local/session storage, a cookie, logs or telemetry. Sign-out clears the visible record snapshot before calling Firebase Auth.

Household scope is entered explicitly on the page, validated against the backend's opaque-ID character/length contract, and held only in page memory. There is no default tenant, membership creation or provisioning. The backend is responsible for verifying Firebase identity and current active membership on every request.

## Current API interface

Only these fixed reads are exposed:

| Request | Headers | Response envelope |
| --- | --- | --- |
| `GET /api/v1/kitchen` | `Authorization: Bearer <Firebase ID token>`, `X-Household-ID: <explicit ID>` | `{ schema_version: 1, request_id, result: { observations: [...] } }` |
| `GET /api/v1/shopping` | `Authorization: Bearer <Firebase ID token>`, `X-Household-ID: <explicit ID>` | `{ schema_version: 1, request_id, result: { entries: [...] } }` |

Both calls use `cache: no-store`, omit cookies, reject redirects, have a 12 second timeout, accept cancellation, and validate record fields before display. The API helper has no generic path or method parameter, so callers cannot send mutations or model-controlled URLs. Writes to facts, outcomes or shopping are not available in this browser connection.

The page distinguishes sign-in (401), household access (403), stale/conflict (409), request validation (422), throttling (429), and service failure (503/5xx), with recovery guidance. An empty result is displayed as empty; it is never filled with demo records.

## Local verification and remaining evidence

Use package-local `npm run lint`, `npx tsc --noEmit`, and `npm run build` from `frontend/` when code checks are authorized. No unit tests or test dependencies are added. An offline build/type/lint pass does not verify Google OAuth, project configuration, backend CORS, Firebase token verification, household membership, Firestore data or deployed behavior. Do not use real credentials or call live services as part of an offline check.

Official references: [Google sign-in for Web](https://firebase.google.com/docs/auth/web/google-signin), [Auth state persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence), [Firebase Web app configuration](https://firebase.google.com/docs/web/learn-more#config-object).
