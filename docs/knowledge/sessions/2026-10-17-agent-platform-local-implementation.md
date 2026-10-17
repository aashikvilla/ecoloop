# Agent Platform local integration — 17 October 2026

## Scope

Implemented the local code path for Google Agents CLI/ADK managed sessions and explicit-consent Memory Bank, while keeping all managed capabilities disabled by default. No Google Cloud resource was created or changed, no provider/model call was issued, and no environment file was read. The owner requested a total-project monthly ceiling; the existing ₹2,000 Gemini-only budget does not satisfy it, and budget alerts alone are not a hard spend cap. Cost-control verification remains open.

## Changes

- Installed and verified Google Agents CLI `v1.10.0`; added its official workspace skills and an EcoLoop-specific agent specification. Kept the existing custom FastAPI/ADK layout; no generated scaffold was applied.
- Added `google-cloud-agentplatform` to backend project metadata, lockfile, and exported requirements.
- Added opt-in `VertexAiSessionService` selection using an existing Agent Engine ID, bounded configurable idle TTL, and deterministic mapping of caller session IDs to provider-safe IDs. In-memory sessions remain the default. Health distinguishes configuration from verified service capability; it makes no provider probe.
- Added an opt-in direct Memory Bank adapter. Firestore is canonical. Only explicitly consented, persisted preference facts are written; raw prompts, session transcripts, household inventory and model-generated preference text are never submitted. Retrieval is bounded and static-query only; provider results are treated as candidate IDs and must match the owner-scoped, active, consented canonical Firestore preference before being given to ADK.
- Added versioned Firestore sync state and lease handling for corrections/revocations, an explicit manual retry endpoint/UI, and deletion tombstones. When Memory Bank is unavailable, cleanup stays visible as reconciliation-required instead of being reported complete. No background reconciler is included.
- Updated frontend API validation and Settings copy to show `not_configured`, `configured_unverified`, and cleanup states.

## Review and verification

- Two independent read-only GPT-6 Luna/high reviews found and helped correct API response mismatches, an incorrectly routed retry, command-gate bypass, cleanup tombstone loss, static type mismatches and provider-invalid session IDs. Final re-reviews confirmed the cleanup/session fixes and all four frontend contract fixes; neither reviewer edited files or accessed cloud/environment data.
- `uv sync --locked --no-install-project` resolved the lock and installed `google-cloud-agentplatform==2.5.0` locally. SDK import succeeded.
- Frontend ESLint and TypeScript checks passed after the contract fixes.
- Backend `uv run --locked python -m compileall -q app`, `uv lock --check`, and `git diff --check` passed after the changes.
- No frontend/backend unit tests, frontend production build, authenticated browser write, Memory Bank/managed Session call, AI call, Cloud Run deployment, API enablement, billing change, or credential/environment-file read occurred.

## Remaining gates

M0.02.01/02/03 and M3.01.01/02/03 remain unchecked. Still required: agree and verify an all-services monthly budget and any enforceable service-specific spend controls, then confirm region/IAM/credits and API readiness; provision/identify an authorized Agent Engine resource; perform authenticated managed-session and tool-call checks; prove consented preference recall across two distinct managed sessions and cross-user isolation; prove correction/revocation/deletion including retry; verify provider retention and costs; then have the reviewer complete M3 exit evidence. No phase gate or `main` merge follows from this local code checkpoint.

## Branch and workspace

Branch: `codex/demo-integration`. Git reports this root checkout as the only registered worktree. Changes are uncommitted pending final reviewer/checkpoint summary. PR #1 remains a draft; main remains unchanged.
