# Google Maps browser and server keys

EcoLoop uses two different Google Maps keys because one runs in a user's browser and the other calls a server API.

## Browser key: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

- Used by the Next.js client for Maps JavaScript and Places autocomplete. A `NEXT_PUBLIC_` value is visible to every site visitor; it is configuration, not a secret.
- Create/manage it in Google Cloud Console → **APIs & Services → Credentials**. Restrict application usage to authorized website referrers (the EcoLoop Cloud Run web origin and required local development origins) and restrict APIs to only the Maps JavaScript/Places APIs the UI uses.
- The configured key is already stored as a GitHub Actions repository variable, because Next.js embeds it at build time. Do not copy it into the API's `GOOGLE_MAPS_ROUTES_API_KEY` setting.

## Server key: `GOOGLE_MAPS_ROUTES_API_KEY`

- Used only by FastAPI for Google Routes API calls. It must never have a `NEXT_PUBLIC_` name, enter a frontend bundle, or be committed.
- Create it in Google Cloud Console → **APIs & Services → Credentials → Create credentials → API key**, then edit its API restrictions to allow only **Routes API** (`routes.googleapis.com`). Enable Routes API in the same billing project. If the Cloud Run service later uses known static egress IPs, add an application restriction; this service currently has dynamic egress, so the deployed key is restricted by API and kept private in Secret Manager instead.
- The demo key is stored at Secret Manager secret `ecoloop-google-maps-routes`, version `1`. Only `ecoloop-api-runtime` has `roles/secretmanager.secretAccessor`. Cloud Run receives it at deploy time as `GOOGLE_MAPS_ROUTES_API_KEY`. The same value is in ignored `backend/.env` for local API runs; `backend/.env.example` contains an empty placeholder.
- To rotate it, create a new Routes-restricted key, add a new Secret Manager version, update the workflow's pinned version, deploy a candidate, verify Routes, then disable/delete the old key. Never print the key during provisioning: gcloud key creation can return the raw key string even when a name-only output format is requested. Revoke and replace a key if its value is exposed.

## Existing deployment config

The GitHub Actions repo already has public Firebase web settings, the public browser Maps key, Workload Identity Federation/deployer identity and Agent Engine ID. The API uses its Cloud Run service identity for Vertex AI; it does not require a Gemini API key. The Route server key is provisioned through Secret Manager, not GitHub Actions. The project has an alert-only monthly budget, not a hard all-services spend ceiling; keep AI calls bounded and verify billing before scaling use.
