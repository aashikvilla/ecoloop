# Google ADK Concepts & Architecture

## Core Components

1. **Orchestrator**:
   - The central loop that feeds user intents, context, and system instructions into Gemini.
   - When Gemini responds with tool call requests (`function_calls`), the orchestrator looks up the corresponding function in an allowlist registry, runs the function, and returns the tool output (`function_response`) back to Gemini.

2. **Session State vs. Ephemeral Memory**:
   - Never use local SQLite files on ephemeral Cloud Run instances.
   - State must be saved in Firestore under `tenants/{tenantId}/sessions/{sessionId}`.
   - Separate conversational history from verified domain state (`inventory`, `meal_plans`).

3. **Telemetry & Tracing (`AgentTrace`)**:
   Every agent execution produces a telemetry trace record:
   - `trace_id`: UUID
   - `model`: e.g. `gemini-2.5-flash`
   - `tools_invoked`: List of tool names called in order
   - `total_tokens`: Input + output tokens
   - `latency_ms`: Execution duration
   - `success`: Boolean
