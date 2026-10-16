# AI structured output schema fix — 17 October 2026

## Finding

A local Ask attempt failed before any provider request. ADK passes `AgentOutput`'s Pydantic JSON Schema to `google-genai` 2.31.0, whose `process_schema` rejects non-string JSON Schema `const` values with `ValueError: Literal values must be strings.` The nested proposal schema contains numeric `schema_version: Literal[1]` and boolean `requires_explicit_consent: Literal[True]` fields.

## Change

`backend/app/agents/household.py` now adjusts only the schema returned by `AgentOutput.model_json_schema()`: non-string literal constants become their primitive JSON types for provider generation. The proposal model validators remain unchanged, and the generated response still passes through the strict `ProposalCard` union before returning to the API. No arbitrary UI, action execution, or mutation tools were added.

## Local evidence

Using the existing root backend virtual environment (`google-adk` 2.12.0, `google-genai` 2.31.0, Pydantic 2.14.1), with the worktree as the current directory:

- Before the change, calling `google.genai._transformers.process_schema(AgentOutput.model_json_schema(), None)` reproduced `ValueError: Literal values must be strings.`
- After the change, the same local schema conversion completed successfully (`provider schema conversion: ok`).
- A valid meal proposal passed the strict card adapter, while `schema_version: "1"` was rejected (`strict numeric schema_version rejects string: ok`).
- No provider request, cloud call, unit test, or environment-file read was performed.

## Timeout and error path review

The backend wraps `runner.run_async()` in `asyncio.timeout(settings.AGENT_REQUEST_TIMEOUT_SECONDS)` and maps expiry to `DomainError("AGENT_TIMEOUT", ..., 504, True)`. The existing FastAPI `DomainError` handler preserves the 504 status and retryable flag. The provider-run timeout currently starts after local runner/session initialization; schema conversion failures there are caught as generic assistant unavailability (503), which correctly distinguishes preflight/configuration failure from a provider response timeout. The frontend's prior 12-second request budget was shorter than the backend's 20-second default; root is addressing the assistant transport budget separately.

## Not yet proven

This verifies local SDK schema conversion and local strict validation only. A live provider response remains necessary to prove that the provider accepts the schema and emits a response which passes strict validation. Root will perform one bounded synthetic Ask call after review/merge.

A separate context-selection limitation surfaced during integrated audit: explicit `context_item_ids` are filtered only among the 200 newest observations, so an older selected ID may be omitted. This is outside the schema fix and should be handled as a separate unit.
