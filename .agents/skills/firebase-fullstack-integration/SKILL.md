---
name: firebase-fullstack-integration
description: Design household Firebase identity, versioned Firestore facts, private media, and the single-project hackathon setup.
---

# firebase-fullstack-integration

Spec sections 4/5/7. Firestore owns confirmed observations/actions/outcomes. Admin SDK bypasses client rules: server queries check scope. Signed media bounded and retained minimally. Demo isolated; memory separate.

For the EcoLoop hackathon, use the existing named Firebase/GCP project as the only environment by default. Do not create a separate staging or production project unless the owner explicitly asks. Before enabling billing, inspect every project currently linked to the billing account and verify available credits in the Billing console; never infer credits from account status or budget alerts.

Authority: docs/planning/CURRENT_MVP_SPEC.md and docs/planning/IMPLEMENTATION_PLAN.md. Follow the current unit acceptance; use only the approved single Firebase project and environment.
