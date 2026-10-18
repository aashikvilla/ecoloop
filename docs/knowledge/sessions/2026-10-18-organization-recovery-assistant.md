# Organization recovery assistant implementation — 18 October 2026

## Scope

Added a local source implementation for an authenticated organization recovery request path. Gemini extracts a bounded typed constraint draft from the operator's natural-language request; the result is validated and merged with explicit structured fields. Missing food, amount/unit, deadline, radius, or people-to-portion basis produces a clarification. A fully structured request can use deterministic planning without a model call, so manual fields remain usable when AI is disabled.

The backend performs authorized discovery and deterministic matching for item terms, exact units, positive available quantity, donor suitability/storage declarations, declared dietary tags, radius, and pickup deadline. It returns at most two alternatives with distinct offer sets, exact coverage/shortfall arithmetic, coarse locations, and straight-line distance labels. It does not reserve. Exact donor coordinates are never returned by discovery. Route status remains unavailable until the separate post-reservation Routes flow is configured; no travel time is fabricated.

## Changed organization-owned paths

- `backend/app/api/v1/endpoints/recovery.py`: authenticated `POST /api/v1/recovery/assistant` route.
- `backend/app/domain/recovery_assistant.py`: bounded Gemini constraint extraction, clarification, deterministic offer filtering, and plan construction.
- `backend/app/schemas/recipient.py`: strict request, plan suggestion, and response schemas.
- `frontend/src/lib/canonical-recipient.ts`: typed API transport and response contract.
- `frontend/src/components/organization/recovery-assistant.tsx`: natural-language plus structured request UI and clarification/plan display.

## Evidence and limits

- Backend `compileall -q app` passed.
- FastAPI OpenAPI import registered `POST /api/v1/recovery/assistant`.
- Frontend `pnpm lint` and `pnpm exec tsc --noEmit` passed. The initial JSX parse error was corrected before the passing run.
- `git diff --check` passed.
- No model call, authenticated API request, browser journey, Firestore mutation, test, deployment, or cloud setting change was performed for this slice.
- The latest AI acceptance journal records zero open eligible offers within the demo organization's 5 km radius and an unset Google Routes key. No offer was seeded or published to validate plan options. The truthful empty result remains the only supported operational state in that evidence snapshot.

## Remaining acceptance

Run one authenticated natural-language turn and one fully structured turn against the configured provider, including a people request that asks for portions-per-person clarification. Verify one and two option cases against eligible, owner-approved demo offers only when real surplus is available or a separately labelled non-operational simulation path is approved. Verify that no suggestion creates a claim and that post-reservation Routes timing appears only from an actual provider response. No architecture decision changed; see [the recipient pickup plan](../../planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md), [the demo remediation plan](../../planning/DEMO_FLOW_REMEDIATION_PLAN.md), and the [AI acceptance journal](2026-10-18-ai-demo-acceptance.md).
