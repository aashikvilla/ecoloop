---
name: firebase-fullstack-integration
description: Design household Firebase identity, versioned Firestore facts, private media, and the single-project hackathon setup.
---

# firebase-fullstack-integration

Spec sections 4/5/7. Firestore owns confirmed observations/actions/outcomes. Admin SDK bypasses client rules: server queries check scope. Signed media bounded and retained minimally. Demo isolated; memory separate.

For the EcoLoop hackathon, use the existing named Firebase/GCP project as the only environment by default. Do not create a separate staging or production project unless the owner explicitly asks. Before enabling billing, inspect every project currently linked to the billing account and verify available credits in the Billing console; never infer credits from account status or budget alerts.

Read docs/planning/00_START_HERE.md and current unit acceptance. This entry supersedes the archived package at docs/archive/2026-10-15-pre-consumer-replan/.agents/. Do not auto-load, copy or execute archived examples/references as current policy or proof.
