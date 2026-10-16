# AI structured output schema fix — 17 October 2026

## Finding

The first local Ask attempt failed before any provider request. `google-genai` 2.31.0's `process_schema` rejects the Pydantic proposal schema's numeric and boolean `const` values with `ValueError: Literal values must be strings.` The initial fix made `process_schema` pass, but the merged UI attempt then exposed the next conversion stage: `types.Schema` rejects Pydantic's `discriminator` and `oneOf` keys with `extra_forbidden` validation errors.

## Change

`backend/app/agents/household.py` now supplies `AgentOutput.model_json_schema()` through `GenerateContentConfig.response_json_schema` with `response_mime_type="application/json"`. It no longer routes the schema through ADK `output_schema` / GenAI `response_schema`, which converts Pydantic's full JSON Schema into the narrower `types.Schema`. This preserves the complete provider JSON Schema, including discriminated card alternatives. The response is still parsed and locally validated against the strict `AgentOutput` / `ProposalCard` models before returning to the API. No arbitrary UI, action execution, or mutation tools were added.

## Local evidence

Using the existing root backend virtual environment (`google-adk` 2.12.0, `google-genai` 2.31.0, Pydantic 2.14.1), with `backend/` in the isolated worktree as the working directory:

- The full `google.genai.models._GenerateContentParameters_to_mldev` conversion with `response_schema=AgentOutput` reproduced `ValidationError` for `properties.cards.items.discriminator` and `properties.cards.items.oneOf`.
- Constructing an ADK `LlmAgent` and `LlmRequest` with `response_json_schema=AgentOutput.model_json_schema()` succeeded; the full GenAI MLDev parameter conversion succeeded and emitted `responseJsonSchema`.
- A valid meal proposal passed strict card validation, while `schema_version: "1"` was rejected.
- The offline converter used a dummy client key and made no network request. No cloud call, unit test, or environment-file read was performed.

## Timeout and error path review

The backend wraps `runner.run_async()` in `asyncio.timeout(settings.AGENT_REQUEST_TIMEOUT_SECONDS)` and maps expiry to `DomainError("AGENT_TIMEOUT", ..., 504, True)`. The existing FastAPI `DomainError` handler preserves the 504 status and retryable flag. The provider-run timeout starts after local runner/session initialization; schema conversion failures there are caught as generic assistant unavailability (503), distinct from a provider response timeout. The frontend's prior 12-second request budget was shorter than the backend's 20-second default; root is addressing the assistant transport budget separately.

## Not yet proven

Local ADK and GenAI request conversion plus strict response validation pass. A live provider response remains necessary to prove service acceptance and an emitted response passing strict validation. Root will perform one bounded synthetic Ask call after review/restart.

A separate context-selection limitation surfaced during integrated audit: explicit `context_item_ids` are filtered only among the 200 newest observations, so an older selected ID may be omitted. This is outside the schema fix and should be handled separately.
