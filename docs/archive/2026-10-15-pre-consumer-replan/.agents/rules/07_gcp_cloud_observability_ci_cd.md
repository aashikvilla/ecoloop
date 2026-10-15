# Google Cloud Observability, Telemetry & CI/CD

> **Scope**: GCP deployment, Cloud Run monitoring, Cloud Logging, Cloud Trace, continuous verification.  
> **Guiding Principle**: Production systems must be self-observant, auditable, and continuously verified through automated gates.

---

## 1. Structured Cloud Logging

1. **Standard Log Envelope**:
   All log outputs in Cloud Run must be formatted as single-line JSON with the standard Google Cloud Logging fields:
   - `severity`: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.
   - `message`: Clear human-readable summary.
   - `logging.googleapis.com/trace`: Trace ID formatted as `projects/${PROJECT_ID}/traces/${TRACE_ID}` for correlation with Cloud Trace.
   - `component`: Subsystem identifier (`intake_parser`, `adk_orchestrator`, `fssai_gate`).
   - `tenant_id`: Scoped tenant identifier.

2. **No Sensitive Data**:
   - Never log authorization bearer tokens, personal phone numbers, or private diner schedules.
   - Truncate base64 image data before logging intake payloads.

---

## 2. Cloud Monitoring & Metrics

1. **Service Level Indicators (SLIs)**:
   - **Availability**: Proportion of HTTP requests returning `< 500`.
   - **Decision Latency**: Proportion of `/v1/decisions/evaluate` calls resolving in $< 3.0\text{s}$.
   - **Orchestrator Cost/Token Consumption**: Track cumulative input/output tokens per session.

2. **Custom OpenTelemetry Metrics**:
   - `ecoloop.food_diverted_kg`: Counter incremented upon confirmed outcome record.
   - `ecoloop.avoided_purchase_inr`: Counter incremented upon mock cart optimization.
   - `ecoloop.safety_violations_blocked`: Counter tracking invalid/spoiled offers rejected by rules.

---

## 3. Continuous Verification & Deployment Gates

1. **Pre-Push Quality Gate**:
   - Type checking: `npm run build` (Next.js) and `pyright` or `mypy` (FastAPI).
   - Unit tests & Gold Cases: `python eval_runner.py` must pass with 100% correctness and 0 safety violations.
   - Code formatting and linting: `eslint` on frontend and `ruff` on backend.

2. **Deployment Rollouts**:
   - Cloud Run: Zero-downtime rolling updates with traffic splitting (`gcloud run services update-traffic`).
   - Firebase App Hosting: Automated builds triggered on Git push to `main` branch.
