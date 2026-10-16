---
name: continuous-verification-cicd
description: Plan household acceptance verification and the single-environment hackathon deployment flow when deployment work is requested.
---

# continuous-verification-cicd

Use current units, not archived benchmark counts. Verification and deployment are separate authorizations. Pin available versions; review IAM/secrets/rollback without reading real env files. No CI work during documentation-only scope; no fabricated comparator gates.

For the EcoLoop hackathon, use the one named GCP/Firebase project and one environment by default. Do not introduce staging/production separation unless the owner explicitly requests it. Before enabling billing, review all projects linked to the billing account; budget alerts notify but do not cap spend. Check credits in the active account's Billing → Credits page and report unknown when the page cannot be verified. Prefer quotas and disabled unused services as additional cost controls. Deployment still requires an authorized user request and verified rollback/health evidence.

Read docs/planning/00_START_HERE.md and current unit acceptance. This entry supersedes the archived package at docs/archive/2026-10-15-pre-consumer-replan/.agents/. Do not auto-load, copy or execute archived examples/references as current policy or proof.
