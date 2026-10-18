# Main deployment and household creation follow-up — 18 October 2026

## Outcome

- Promoted the current `main` source (`4e08b04`) to the existing Cloud Run services through GitHub Actions run [39121041553](https://github.com/aashikvilla/ecoloop/actions/runs/39121041553). The workflow built immutable images, deployed candidates, passed its smoke checks and promoted both services.
- Live traffic is 100% on API revision `ecoloop-api-00034-vam` and web revision `ecoloop-web-00018-ful`. `GET https://ecoloop-api-4wlelpcnca-el.a.run.app/api/v1/health` and `GET https://ecoloop-web-4wlelpcnca-el.a.run.app/account` both returned HTTP 200.
- The owner approved the managed-context release gate. The API is configured with Vertex AI, managed Sessions and Memory Bank enabled. Health checks establish configuration only; no live model request or managed-session/memory persistence check was made in this deployment pass.
- The cloud billing console showed no credits, a ₹2,000 monthly billing alert, and a configured ₹2,000 Gemini spend cap. No cost was incurred deliberately as part of this verification.

## Household creation verification

- Root cause of the local disabled message: port 3000 was serving an older `next start` bundle with `NEXT_PUBLIC_ECOLOOP_ENABLE_HOUSEHOLD_CREATE=false`. The local launcher sets the feature flag to `true` and connects to the local API on port 8001.
- Replaced the stale local frontend process using `deploy/local.ps1 -Service frontend -FrontendPort 3000 -BackendPort 8001`; started the API using the same launcher on port 8001. API health returned 200.
- Signed in with the public consumer demo account on the local app and the deployed app. On each, opened “Create another household,” advanced to the review step, and verified the final “Create household” button was enabled. The live page is the deployed main revision. No final submit occurred, so this check created no household or Firestore record.
- The local app is left running on port 3000 with the household-creation flag enabled and an empty setup form. The API remains on port 8001. The temporary form name used during UI verification was cleared.
- No application source code was changed. The repeated stale-process lesson is already recorded in [Past Mistakes](../PAST_MISTAKES.md#2026-10-17-keep-local-app-port-cors-and-launcher-flags-in-sync); no new architecture decision was needed. The live MVPTasks Sheet was not updated.

## Remaining verification

- A full database creation/readback round trip was intentionally not submitted. The deployed control and service configuration were verified without creating extra demo data.
- Vertex AI model execution and managed Session/Memory persistence were not exercised; the workflow calls these services “configured unverified.”
