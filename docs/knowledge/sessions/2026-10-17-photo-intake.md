# Bounded photo candidate intake — 17 October 2026

## Scope and implementation

Added a photo path to `/kitchen/add`. The browser accepts JPEG, PNG, and WebP files up to 2 MB, offers the device camera through `capture=environment`, and uploads the selected bytes directly to the authenticated FastAPI endpoint. No image file is written by the browser application or backend, and this flow does not use Cloud Storage.

FastAPI retains the existing Firebase identity and household membership dependency, enforces a photo-specific streamed request bound, validates declared MIME type against file signatures, and calls the configured Gemini Developer API only when `AGENT_ENABLED=true` and a Developer API key is present. Gemini output is parsed with a strict candidate schema and then written through the existing creator-private, unconfirmed intake transaction. Photo bytes are not logged or persisted. Idempotency binds the actor-scoped intake key to the MIME type and image digest so retries do not depend on repeat model wording. No candidate is confirmed or written into canonical Kitchen facts by extraction.

The UI uses the existing default-off browser command flag, preserves the same selected file/retry key after an ambiguous response, gives a manual-entry path for extraction/provider failures, and links successful candidate drafts to explicit review. Server error codes for provider configuration and extraction failures are translated into clear client messages without exposing provider details or credentials.

## Verification

- `uv run python -m compileall -q app` passed in `backend/` after implementation.
- `npx tsc --noEmit` passed in `frontend/`.
- `git diff --check` passed.
- The first frontend dependency install attempt left a partial tree; the next `npm ci` completed after about two minutes. `npm run lint` then completed successfully.
- No unit tests were added or run. No credentials were read or printed, and no Gemini or Firebase live request was made.

## Remaining evidence and setup

Real Gemini response behavior, Firestore persistence, authenticated browser journey, and provider availability remain unverified. For photo extraction, configure `AGENT_ENABLED=true`, `AGENT_PROVIDER=gemini_api` or `auto`, and a Gemini Developer API key in the runtime environment; keep the app's `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS` flag default-off until live identity/database acceptance is reviewed. No bucket setup is required by this no-media-persistence slice. Provider-side processing or retention behavior is not asserted.

Architecture pointer: `docs/knowledge/ARCHITECTURE.md`. Decision: `docs/knowledge/DECISIONS.md`. Retry lesson: `docs/knowledge/PAST_MISTAKES.md`.
