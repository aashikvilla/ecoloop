# Consolidated local coding and regression checkpoint — 17 October 2026

## Branch and worktrees

Root integration: `codex/demo-integration`. Integrated photo-intake commit `29477eb` after review. The photo UI accepts bounded JPEG/PNG/WebP and submits authenticated bytes for Gemini candidate extraction; only candidate records persist, not the image. `FoodAction` cards now link into existing owner-reviewed outcome/share forms. Earlier branch-specific implementations are already represented in the root integration tree/history; outdated reference branches were not blindly merged. See the current branch log before removing worktrees. No worktree has been removed yet.

## Checks

- Backend `uv run --locked --project backend python -m compileall -q backend/app`: passed.
- Frontend ESLint: passed.
- Frontend TypeScript (`npx tsc --noEmit`): passed.
- Frontend production build: passed, 15 route outputs including account, settings, intake review, item outcome/share, Ask, Activity and Shop.
- `git diff --check`: passed before final documentation/code adjustment; rerun before commit.
- No unit tests, provider calls, Firebase writes, billing changes, or deployments were performed in this checkpoint.

The first parallel frontend check raced with several old dev servers and found corrupted ignored Next `.next/dev/types/validator.ts`; the app listeners were stopped, only the exact malformed generated lines were removed, and a clean production build/typecheck then passed.

## Implemented local product coding

- Auth gate, Google/email sign-in, solo household onboarding, household discovery/selection and sign-out.
- Canonical authenticated API reads for Home, Kitchen, Ask, Shop, Activity and Settings; no browser mock-store fallback.
- Manual/text/photo candidate capture, candidate review and explicit confirmation. Photo request is size/MIME/signature bounded and image bytes are not retained.
- Firestore-backed pantry/shopping commands, outcomes, owner-private sharing/activity/history and consented owner-private preferences.
- One ADK orchestrator with scoped read-only pantry/shopping tools, validated typed cards, durable private proposal turns and explicit BuyCheck-to-shopping approval.
- Activity summaries measured/estimated/unknown outcomes without a fabricated sustainability score.

## Still open

- Managed Agent Runtime, Sessions and Memory Bank; preference CRUD is local Firestore-backed and does not prove managed Memory Bank.
- Private Storage upload/finalize/retention lifecycle; current photo flow uses transient request bytes and persists candidates only.
- Additional actionable approval workflows for MealSuggestion, PortionAdjustment and PreferenceConsent; FoodAction links to existing review pages but does not auto-confirm.
- Manual browser acceptance across every route and command; browser automation previously refused the localhost tab. One bounded durable Gemini response is recorded historically, but no new AI call was made in this checkpoint and photo extraction has not been exercised against a live provider.
- Billing account/project linkage, linked-project/cost review, budget/controls, required cloud APIs/IAM, Cloud Run/App Hosting deployment, deployed acceptance, and live MVPTasks reconciliation.

Status is local code and verification only. Do not claim the cloud product or phase exits complete. `docs/STATUS.md` remains a dated snapshot; the live task sheet remains authoritative.
