# AI structured output schema fix — 17 October 2026

## Finding and change

The initial Ask request failed before network because `google-genai` 2.31.0 rejects non-string literals during `response_schema` conversion. A later full UI request using `response_json_schema` reached Google but returned HTTP 400 `INVALID_ARGUMENT`; its response did not identify which JSON Schema feature was unsupported. The schema contains Pydantic-specific `gt`/`ge`/`le`, `discriminator`, and `oneOf` structures.

The current implementation sends JSON MIME mode without `output_schema`, `response_schema`, or `response_json_schema`. It appends the compact `AgentOutput.model_json_schema()` JSON to EcoLoop's trusted agent instruction as output-format guidance. `_output_from_events` still parses `AgentOutput`, and `_validate_cards` plus the strict `ProposalCard` models remain authoritative. No arbitrary UI or mutation tools were added.

## Local evidence

Using the existing backend virtual environment (`google-adk` 2.12.0, `google-genai` 2.31.0, Pydantic 2.14.1), with the isolated worktree `backend/` as the current directory:

- Offline ADK `LlmAgent` / `LlmRequest` construction and full GenAI MLDev parameter conversion succeeded with `response_mime_type="application/json"` and no response schema fields.
- The converted request contained the trusted system instruction with the compact JSON schema and emitted `responseMimeType` without `responseSchema` or `responseJsonSchema`.
- Strict local validation accepted a valid meal card and rejected string `schema_version: "1"`.
- The offline converter used a dummy key and made no network call. No cloud call, unit test, or environment-file read was performed.

## Timeout and error path

The backend wraps `runner.run_async()` in `asyncio.timeout(settings.AGENT_REQUEST_TIMEOUT_SECONDS)` and maps expiry to retryable 504. The FastAPI domain error handler preserves that status. Local runner/session initialization happens before the provider-run timeout; errors there map to 503. Root separately raised the frontend assistant request budget beyond the backend's 20-second default.

## Remaining proof and limitation

One bounded live synthetic Ask response is still needed to confirm a provider response passes strict validation. Root will run it after review/restart; stop after that attempt if the provider reports quota or authorization failure.

A separate integrated audit found that explicit `context_item_ids` are filtered only among the 200 newest observations, so an older selected ID may be omitted. Handle this separately from schema generation.
## Final live acceptance — integration `55c5e23`

The final JSON-mode request succeeded through the signed-in local browser at `http://127.0.0.1:3003/ask`, Firebase identity/membership, live synthetic Firestore facts, FastAPI, ADK and Gemini Developer API. Backend access log: `POST /api/v1/assistant/turns` HTTP 200. Model: `gemini-3.1-flash-lite`; output cap 1,536 tokens; model timeout 30 seconds; client timeout 70 seconds. No automatic browser retry occurred. One earlier request reached the provider with schema constraints and received HTTP 400; earlier SDK conversion failures did not reach the provider.

Browser displayed the returned message: “You can prepare a simple sautéed spinach and tomato dish. Please ensure the ingredients are in good condition before use.” A MealSuggestion card titled “Sautéed Spinach and Tomatoes” rendered for one person, with Tomatoes 6 pieces and Spinach 200 g, matching the supplied known kitchen records. The proposal remained pending/simulated, with approval disabled; no canonical record changed. The backend strict `AgentOutput`/card/source-reference checks and frontend card validator accepted this response. No arbitrary markup/code was generated or executed.

This proves one actual model-to-typed-React-card path. It does not prove quality across all card types, model safety, managed Sessions/Memory Bank, approval persistence or deployed behavior. No usage/token/latency/cost claim is made. The local API remains enabled for the authorized demo with the stated limits; release defaults and browser command writes remain off. The working result is left open in the browser.
