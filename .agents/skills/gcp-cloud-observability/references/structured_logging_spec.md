# Google Cloud Structured Logging Specification

## Required & Reserved Fields

When writing JSON to stdout/stderr in Cloud Run, Cloud Logging interprets specific top-level JSON fields:

| Field Name | Type | Description |
|---|---|---|
| `message` | string | Human-readable log message shown in the Cloud Logging summary line |
| `severity` | string | `DEBUG`, `INFO`, `NOTICE`, `WARNING`, `ERROR`, `CRITICAL`, `ALERT` |
| `logging.googleapis.com/trace` | string | `projects/{project_id}/traces/{trace_id}` |
| `logging.googleapis.com/spanId` | string | 16-character hex string representing span ID |
| `logging.googleapis.com/trace_sampled` | boolean | Indicates whether the trace was sampled |
| `time` | string | RFC 3339 timestamp (e.g. `2026-10-15T04:26:00Z`) |

## Correlating Cloud Run Ingress Traces

Cloud Run automatically injects the `X-Cloud-Trace-Context` header:
```text
X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=TRACE_TRUE
```
Extract `TRACE_ID` in your FastAPI middleware and prefix it with `projects/${PROJECT_ID}/traces/`.
