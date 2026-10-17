# Separate Firebase browser connection

The `/account` route is a secondary, read-only connection to canonical household records. It does not consume or import the synthetic browser store. The demo experience continues to use only its isolated local state.

## Configuration

The frontend local environment uses the existing Web App in project `ecoloop-staging-20261015` (app ID `1:26177403871:web:8b3125a80812c8c28be26a`). Firebase Web config values identify a Firebase app and are public client configuration; do not put service-account credentials or private keys in these variables. The ignored local `.env.local` is not committed.

Firebase Authentication must have Email/Password and Google sign-in enabled, and the current hostname authorized. The account UI supports email/password sign-in and account creation plus Google popup sign-in. Provider settings are managed in Firebase Authentication; frontend code does not enable them. Set `NEXT_PUBLIC_ECOLOOP_API_ORIGIN` to the exact authorized FastAPI service origin and configure that app origin in backend CORS before loading household records.

With no complete Firebase config, `/account` displays an unavailable state and does not import or initialize Firebase Auth. The API origin must be a bare HTTPS origin. HTTP is accepted only for localhost, `127.0.0.1` or `::1` development.

## Authentication and scope

The browser uses Firebase's modular Web Auth SDK with email/password and a user-initiated Google popup, using browser-session persistence. The SDK owns authentication state and refresh behavior; the application never writes the ID token to local/session storage, a cookie, logs or telemetry. Sign-out clears the visible record snapshot before calling Firebase Auth.

Household scope is entered explicitly on the page, validated against the backend's opaque-ID character/length contract, and held only in page memory. There is no default tenant, membership creation or provisioning. The backend is responsible for verifying Firebase identity and current active membership on every request.

## Current API interface

Only these fixed reads are exposed:

| Request                | Headers                                                                      | Response envelope                                                    |
| ---------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/v1/kitchen`  | `Authorization: Bearer <Firebase ID token>`, `X-Household-ID: <explicit ID>` | `{ schema_version: 1, request_id, result: { observations: [...] } }` |
| `GET /api/v1/shopping` | `Authorization: Bearer <Firebase ID token>`, `X-Household-ID: <explicit ID>` | `{ schema_version: 1, request_id, result: { entries: [...] } }`      |

Both calls use `cache: no-store`, omit cookies, reject redirects, have a 12 second timeout, accept cancellation, and validate record fields before display. The API helper has no generic path or method parameter, so callers cannot send mutations or model-controlled URLs. Writes to facts, outcomes or shopping are not available in this browser connection.

The page distinguishes sign-in (401), household access (403), stale/conflict (409), request validation (422), throttling (429), and service failure (503/5xx), with recovery guidance. An empty result is displayed as empty; it is never filled with demo records.

## Local verification and remaining evidence

Use package-local `npm run lint`, `npx tsc --noEmit`, and `npm run build` from `frontend/` when code checks are authorized. No unit tests or test dependencies are added. An offline build/type/lint pass does not verify Google OAuth, project configuration, backend CORS, Firebase token verification, household membership, Firestore data or deployed behavior. Do not use real credentials or call live services as part of an offline check.

Official references: [Google sign-in for Web](https://firebase.google.com/docs/auth/web/google-signin), [Auth state persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence), [Firebase Web app configuration](https://firebase.google.com/docs/web/learn-more#config-object).
