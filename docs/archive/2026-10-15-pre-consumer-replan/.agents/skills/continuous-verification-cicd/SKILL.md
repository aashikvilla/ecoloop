---
name: continuous-verification-cicd
description: >-
  Automate CI/CD pipelines, continuous contract verification, linting, type-checking,
  and deployment rollouts with Google Cloud Build, GitHub Actions, and Firebase App Hosting.
  Use when creating deployment scripts, Cloud Build configurations, or pre-commit verification gates.
---

# Continuous Verification & CI/CD Skill

This skill provides configuration templates and operational procedures for continuously validating, building, and deploying the EcoLoop monorepo.

## Verification Gates
1. **Frontend Gate**: Next.js 15 TypeScript compilation and ESLint audit (`npm run build`).
2. **Backend Gate**: FastAPI Python syntax, type assertions, and gold benchmark cases (`eval_runner.py`).
3. **Cloud Build**: Container image compilation and push to Artifact Registry.
4. **Cloud Run / App Hosting**: Automated rollouts with traffic migration.

---

## 1. Directory Structure

```text
ecoloop/
├── .github/
│   └── workflows/
│       └── ci.yaml           # GitHub Actions quality gate
├── cloudbuild.yaml           # Cloud Build multi-step pipeline
└── scripts/
    └── verify_pipeline.sh    # Local pre-push verification script
```

---

## 2. Cloud Build Pipeline (`cloudbuild.yaml`)

```yaml
steps:
  # 1. Run Backend Benchmarks & Unit Tests
  - name: 'python:3.12-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install uv
        uv pip install --system -r backend/requirements.txt
        python .agents/skills/ecoloop-domain-engine/examples/eval_runner.py

  # 2. Build & Deploy Backend Container to Cloud Run
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/ecoloop-backend:$COMMIT_SHA', 'backend/']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/ecoloop-backend:$COMMIT_SHA']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'ecoloop-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/ecoloop-backend:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
```

---

## 3. References & Examples
- [Cloud Build Pipeline Guide](./references/cloud_build_pipeline.md)
- [Production cloudbuild.yaml](./examples/cloudbuild.yaml)
- [Automated Verification Shell Script](./examples/verify_pipeline.sh)
