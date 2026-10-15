---
name: gcp-cloud-observability
description: >-
  Implement production-grade observability, telemetry, and monitoring using Google Cloud Monitoring,
  Cloud Logging, Cloud Trace, and OpenTelemetry in Python FastAPI on Google Cloud Run.
  Use when configuring structured JSON logs, tracing request lifecycles, setting up alert policies,
  or tracking latency and error SLIs in EcoLoop.
---

# Google Cloud Observability & Monitoring Skill

This skill provides patterns for instrumenting FastAPI services running on Google Cloud Run with Cloud Logging, Cloud Monitoring, and Cloud Trace.

## Key Principles
1. **Single-Line Structured JSON**: Emit logs in GCP-native JSON format directly to stdout. Cloud Run automatically captures and parses them into Google Cloud Logging.
2. **Trace Correlation**: Inject `logging.googleapis.com/trace` into every log record so Cloud Logging and Cloud Trace link requests end-to-end.
3. **OpenTelemetry Metrics**: Export custom latency and business metrics (e.g. food diverted kg) without blocking async request loops.

---

## 1. Directory Structure

```text
backend/app/core/
├── observability/
│   ├── __init__.py
│   ├── logger.py          # Structured JSON logger
│   ├── middleware.py      # HTTP request correlation middleware
│   └── tracer.py          # OpenTelemetry tracer configuration
```

---

## 2. Structured Log Entry Format

```json
{
  "severity": "INFO",
  "message": "Intake note parsed successfully",
  "component": "intake_parser",
  "tenant_id": "tenant-household-101",
  "latency_ms": 234,
  "candidates_count": 3,
  "logging.googleapis.com/trace": "projects/project-7eb2c8c6-27da-46d0-827/traces/4bf92f3577b34da6a3ce929d0e0e4736",
  "logging.googleapis.com/spanId": "00f067aa0ba902b7"
}
```

---

## 3. References & Examples
- [Google Cloud Structured Logging Specification](./references/structured_logging_spec.md)
- [OpenTelemetry and Cloud Trace Integration](./references/opentelemetry_cloud_trace.md)
- [Structured Logger Implementation](./examples/structured_logger.py)
- [FastAPI Observability Middleware](./examples/otel_middleware.py)
