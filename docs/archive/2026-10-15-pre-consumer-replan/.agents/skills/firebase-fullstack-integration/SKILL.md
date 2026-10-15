---
name: firebase-fullstack-integration
description: >-
  Architect and deploy fullstack Firebase solutions including Firebase App Hosting for Next.js 15,
  Firebase Auth token verification, Cloud Firestore versioned state, and Cloud Storage for media.
  Use when configuring apphosting.yaml, Firestore document hierarchies, transactions, or client/server auth.
---

# Firebase Fullstack Integration Skill

This skill provides comprehensive instructions for integrating Firebase App Hosting, Cloud Firestore, Firebase Auth, and Cloud Storage into the EcoLoop monorepo.

## Architectural Guidelines
1. **Firebase App Hosting for Next.js**: The modern serverless platform for hosting Next.js 15 App Router applications. Replaces the deprecated framework-aware classic hosting experiment.
2. **Versioned Canonical Evidence in Firestore**: Never overwrite raw evidence. Store receipts and parsed candidate observations as versioned child collections under each tenant.
3. **Consented Storage Retention**: Media files in Cloud Storage must carry metadata indicating retention policies and access controls.

---

## 1. Directory & Configuration Layout

```text
ecoloop/
├── frontend/
│   ├── apphosting.yaml       # Firebase App Hosting configuration
│   └── src/
│       └── lib/
│           ├── firebase.ts   # Client Firebase SDK initialization
│           └── api.ts        # Authenticated backend client
├── backend/
│   └── app/
│       └── core/
│           ├── firestore.py  # Firestore connection & transactions
│           └── storage.py    # Cloud Storage signed URLs
└── firestore.rules           # Security rules enforcing tenant isolation
```

---

## 2. Firebase App Hosting (`apphosting.yaml`)

Place `apphosting.yaml` inside `frontend/` to control runtime settings:

```yaml
runConfig:
  minInstances: 0
  maxInstances: 5
  concurrency: 80
  cpu: 1
  memoryMiB: 1024

env:
  - variable: NEXT_PUBLIC_API_URL
    value: https://ecoloop-backend-xxx.run.app
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: project-7eb2c8c6-27da-46d0-827
```

---

## 3. Firestore Document Hierarchy

```text
tenants/
  └── {tenantId}/
        ├── metadata (document: type, name, created_at)
        ├── inventory/
        │     └── {itemId} (document: name, quantity, unit, last_verified, status)
        ├── evidence/
        │     └── {evidenceId} (document: type, raw_text, image_uri, parsed_candidate)
        ├── meal_plans/
        │     └── {planId} (document: scheduled_at, headcount, recipe_id)
        └── decisions/
              └── {decisionId} (document: proposals, approver, status, outcome)
```

---

## 4. References & Examples
- [Firebase App Hosting Configuration Guide](./references/apphosting_config.md)
- [Firestore Versioned State & Transactions](./references/firestore_versioned_state.md)
- [Production apphosting.yaml](./examples/apphosting.yaml)
- [Python Firestore Client with Transactions](./examples/firestore_client.py)
