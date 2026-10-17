# ADK household read tools — 17 October 2026

## Scope

Added the next bounded orchestration slice on `codex/adk-household-tools`: two deterministic, read-only tools on the existing single ADK agent. The tools read confirmed pantry observations and active shopping entries within the authenticated household. No model tool accepts a household ID, user ID, or write command.

## Implementation

- ADK session state is initialized from the verified `Principal`; sessions missing or disagreeing with that state are recreated. The in-memory session ID remains namespaced by a hash of UID and household ID.
- Each tool resolves the server-seeded scope and rereads the membership document, requiring the same UID, active state, and role before fetching household data.
- Pantry lookup accepts at most 20 validated opaque item IDs for direct reads, or searches the 200 most recent observations by optional item name and returns up to 20 bounded rows. Existing assistant context remains capped at 20 rows.
- Shopping lookup returns at most 50 sanitized active entries and labels them as intent, not proof of purchase.
- The agent instructions identify both tools as read-only. Durable typed proposals still require the existing separate approval path; no managed Session, Memory Bank, or Runtime claim was added.

## Verification

- `uv run --locked python -m compileall -q app` — passed.
- `uv lock --check` — passed.
- Offline ADK contract check parsed the actual tool functions, confirmed their generated function declarations omit `tool_context` and household identifiers, and registered both functions on one `LlmAgent` — passed. The SDK reported its JSON-schema function declaration feature as experimental.
- `git diff --check` — passed.
- No unit tests, provider calls, database writes, cloud changes, or deployment were run. The backend has no configured lint/type-check command.

## Remaining gates

Managed Sessions, consented Memory Bank, managed Runtime, actual model tool-call trace, live identity/membership and Firestore acceptance, explicit proposal persistence/approval integration, and cloud/deployed end-to-end proof remain open. ADK sessions remain in-process and unmanaged; the 200-observation search bound remains.

Architecture pointer: [current architecture](../ARCHITECTURE.md). Product/API authority: [household MVP specification](../../planning/CURRENT_MVP_SPEC.md). No new architecture decision was made.
