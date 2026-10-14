# OpenTelemetry & Google Cloud Trace

## Architecture

```text
[FastAPI Request] ──> [OpenTelemetry Instrumentor] 
                            │
                            ▼
              [Google Cloud Trace Exporter] ──> [GCP Cloud Trace Console]
```

## Python Packages Required
```bash
pip install opentelemetry-api \
            opentelemetry-sdk \
            opentelemetry-instrumentation-fastapi \
            opentelemetry-exporter-gcp-trace
```

## Trace Spans for Agent Execution
Instrument custom sub-spans for key agent lifecycle moments:
1. `gemini_multimodal_parse`
2. `allowlisted_tool_execution`
3. `firestore_transaction_commit`
