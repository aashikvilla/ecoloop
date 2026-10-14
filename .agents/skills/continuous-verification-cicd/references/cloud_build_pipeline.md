# Cloud Build Pipeline & Release Engineering

## Key Stages

1. **Test & Assertion Stage**:
   - Executes before image construction.
   - Any failure in `eval_runner.py` aborts the pipeline, preventing broken code from publishing to Artifact Registry.

2. **Immutable Container Tags**:
   - Tag images with `$COMMIT_SHA` rather than exclusively using `:latest`.
   - Allows instant rollbacks in Cloud Run:
     ```bash
     gcloud run services update-traffic ecoloop-backend --to-revisions=ecoloop-backend-00042-abc=100
     ```

3. **Secrets Management**:
   - Retrieve API keys (e.g. `GEMINI_API_KEY`) from **Google Secret Manager** at runtime using Cloud Run service account permissions rather than baking them into container build layers.
