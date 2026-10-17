# Main branch Cloud Run releases

`.github/workflows/deploy-main.yml` builds immutable frontend and API images from tracked GitHub checkout files when application code lands on `main`. It deploys tagged Cloud Run candidates, checks the account page, API health, unauthenticated API denial, and exact-origin CORS, then moves traffic to the checked revisions. Failed candidate checks leave current traffic in place. `workflow_dispatch` supports an owner-requested release from `main`.

The workflow uses GitHub OIDC and Google Workload Identity Federation. It has no service-account key. The provider condition is restricted to this repository ID, `refs/heads/main`, and this exact workflow path. The deploy service account can publish to the `ecoloop` Artifact Registry repository and deploy Cloud Run using only the web/API runtime identities. Public Firebase Web SDK settings are stored as repository Actions variables; they are build-time browser configuration and are not private credentials.

Each release explicitly keeps the assistant disabled, uses in-memory sessions, and does not attach a Gemini API key. Adding a Secret Manager version or enabling the assistant requires a separately reviewed release change and live provider/cost verification. The deployment smoke checks do not prove signed-in Firebase/Firestore behavior, model responses, managed Sessions, or Memory Bank.

After merges, inspect **Actions → Deploy EcoLoop to Cloud Run**. A green run means candidate HTTP/health/auth-boundary smoke checks passed and traffic was promoted. To roll back, route traffic to the previously serving revision in Cloud Run; retain its revision name from the service revision history. The workflow keeps every image tagged with its Git commit SHA.

New branches must use a short feature-derived type and name, such as `feature/meal-plans`, `fix/household-create`, or `docs/deploy-guide`; never use a `codex/` prefix.
