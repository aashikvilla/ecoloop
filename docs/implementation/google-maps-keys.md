# Google Maps key configuration

EcoLoop uses `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the browser and
`GOOGLE_MAPS_ROUTES_API_KEY` in the API service. For the hackathon deployment,
both settings currently use the same Google API key value so Maps JavaScript,
Places and server-side Routes share the existing billing setup.

## Current deployment

- The browser value is stored as the GitHub Actions repository variable
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and is embedded in the web build.
- The same value is stored as Secret Manager
  `ecoloop-google-maps-routes` version 2 and mounted by Cloud Run as
  `GOOGLE_MAPS_ROUTES_API_KEY`. Only `ecoloop-api-runtime` can access the
  secret.
- The key's API restrictions already include `routes.googleapis.com`, and a
  live `computeRoutes` request using the version 2 value returned a route.
- The app's daily AI request ceiling is 300 per authenticated user per UTC
  day. The route optimizer has a separate 20-request-per-organization-per-UTC-
  day limit to bound billed Routes calls; this limit applies to plan options
  and confirmed collection routes.
- It has no website-referrer or app restriction, so server-side requests are
  accepted. The API allowlist includes multiple Google Maps services, not just
  Routes. The browser value is visible in the public web bundle; this setup is
  suitable for the current hackathon demo only.

## Variable roles

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is client configuration for Maps
  JavaScript and Places. Never treat a `NEXT_PUBLIC_` value as a secret.
- `GOOGLE_MAPS_ROUTES_API_KEY` is the server setting read by FastAPI for Routes
  calls. Keep it in Secret Manager for Cloud Run and in an ignored local env
  file for local runs; never commit either key value.

The names remain separate because they describe where each service reads its
configuration, even while the values are shared. For a production deployment,
replace this shared value with independently restricted browser and server
keys: constrain the browser key to authorized referrers and only required
client APIs, and constrain the server key to Routes API.

## Other deployment configuration

The GitHub Actions repository also holds Firebase web settings, Workload
Identity Federation/deployer settings and the Agent Engine ID. The API uses
its Cloud Run identity for Vertex AI; it does not need a Gemini API key. The
project has a monthly alert rather than a hard all-services spend ceiling.
Raising EcoLoop's per-user request allowance does not increase Google model
quotas or create a billing cap.
