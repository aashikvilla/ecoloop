# Current stack

Next.js/App Hosting, FastAPI/Cloud Run, real Gemini/ADK. Managed Sessions and consented Memory Bank are core; Firestore owns facts. Managed Runtime preferred, fallback only with documented blocker and equivalent proof. Validate available versions/model/region in M0. Planning is not deployment. Secrets server-side; never read real env files.

Authority: docs/planning/CURRENT_MVP_SPEC.md and IMPLEMENTATION_PLAN.md. Historical packages in docs/archive/ are inactive.

## Hackathon cloud default

Use the single named EcoLoop hackathon GCP/Firebase project and one environment. Do not create staging/production projects, duplicate Firebase apps, or separate environment infrastructure unless the owner explicitly changes scope. The GCP project ID may retain historical wording; its display name is the human-facing label. Before linking or reopening billing, inspect all projects attached to that billing account because activation can affect every linked project. A budget alert is a notification, not a spend cap; pair it with service quotas, disabled unused APIs/resources, and owner-visible cost monitoring. Never claim credits without checking Billing → Credits in the active billing account.
