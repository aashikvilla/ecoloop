# Cloud setup wrap-up — 16 October 2026

## User direction

Use one environment for the hackathon; remove staging assumptions from active guidance. Continue setup and encode defaults in project instructions and relevant skills so future work does not need repeated reminders. No application code changes were requested.

The user has chosen to defer billing and continue without it for now. Keep setup and development local/read-only until billing is added; do not provision paid services or deploy meanwhile.

## Verified state

- Google Cloud CLI and Firebase CLI sign-in work; local ADC refresh succeeds with project `ecoloop-staging-20261015` as quota project. Cloud project is ACTIVE. The user-facing display name is “EcoLoop Hackathon”; Google Cloud project IDs are immutable, so the old ID remains.
- Firebase app `1:26177403871:web:8b3125a80812c8c28be26a` is named “EcoLoop Web.” Firebase CLI is connected. No SDK config files, Analytics, Hosting initialization, App Hosting configuration, Cloud Build pipeline, or deployment was created.
- The current Firebase/GCP project is the single hackathon environment. No second staging or production environment is planned by default.
- EcoLoop is not linked to a billing account. The only listed billing account (`01D6CB-7674DA-904416`) is closed and linked to another active project, “My First Project” (`project-7eb2c8c6-27da-46d0-827`). Reopening it restarts billing for already linked projects. That project has Vertex AI, BigQuery, Cloud SQL and Cloud Storage APIs enabled; API enablement alone does not establish that billable resources exist. Cloud Asset resource inventory was unavailable through the current query. Do not reactivate until the owner reviews linked-project costs and usage.
- The user-selected $10/month alert is not configured. It is a notification, not a spend cap. Additional cost controls should include quotas, unused-service minimization and ongoing spend review.
- The Billing → Credits console page did not load, so credit balance is unknown. Do not claim that credits exist or do not exist without a successful account-level check.
- Firebase connector is connected in Codex; local authenticated `gcloud` and Firebase CLI are the verified administration methods available in this task.
- Repository has no active `firebase.json`, `.firebaserc`, `apphosting.yaml`, or `cloudbuild.yaml`; matches are only in the dated archive. The generic scaffold remains unsuitable for deployment as the household MVP.

## Remaining setup boundary

No code, deployment, billing activation, budget creation, or paid resource creation occurred. Before enabling billing, the owner must review the closed account and the additional linked project. Because that account is shared across projects, an account-level reopen requires a human handoff. Once the account is active and its impact is accepted, verify credits from Billing → Credits, link EcoLoop only if desired, create the $10/month project budget alert, and then review region, IAM, secrets and cost controls before provisioning paid services. Do not treat budget alerts as caps.

## Knowledge updates

Active root instructions, deployment guidance, Firebase guidance, decision register, start page and phase checklist now default to one named hackathon project/environment. The immutable project ID remains as-is. MVP-D18 records the one-environment decision; MVP-D17 now scopes the $10 alert to the single hackathon project. No app source changed and no tests were run.
