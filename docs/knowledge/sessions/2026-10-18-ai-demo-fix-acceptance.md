# AI demo fixes and local acceptance — 18 October 2026

## Scope

Continued implementation on `feature/bengaluru-ai-recovery-demo` after the household recipe and organization request paths were identified as the highest-value demo moments. Used the documented synthetic consumer and NGO accounts. No cloud deployment, source commit, public offer, reservation, receipt, or live household stock change was made.

## Root causes and implementation

- Household Ask diagnostics captured 90 ADK events over 60 seconds, including 43 `read_confirmed_pantry` calls. Tool reads themselves were bounded and fast; the agent repeatedly called the same pantry tool instead of finishing a meal suggestion.
- Selected-item Ask requests already load an authorized Kitchen snapshot (selected item plus a small recent set). That path now uses an ADK runner without redundant tools, while other requests retain the existing read-only tools. ADK `RunConfig` caps a turn at eight model calls. Timeout timing logs use warning level and contain request ID, phase, counts, event kinds, tool names and timings, not prompts or food values.
- The organization assistant now uses a held-open GenAI client for the duration of `generate_content`. The former chained temporary client was closed before sending a request. Its typed Gemini schema is normalized to the SDK's supported JSON Schema subset; the full strict Pydantic model still validates output. Dietary labels are removed from the food-name query before deterministic discovery, while dietary eligibility remains a separate tag check.
- Upcoming Kitchen date cards can open the reviewed surplus form with the canonical item prefilled. `USER_TARGET` remains labeled “Your reminder”; it is not converted to expiry or a safety determination. The donor must confirm storage and inspect condition before publishing.

## Acceptance evidence

- **D1 purchase photo:** previously passed locally with the README donor account. Gemini identified a synthetic spinach image; the canonical Kitchen read found the confirmed 250 g spinach record and advised using existing stock first. No stock write occurred. No-match and ambiguous-match cases remain open.
- **D2 meal suggestion:** authenticated Vertex/ADK request returned in about 15 seconds. The pending proposal was “Spinach and Tomato Bruschetta,” linked to the confirmed spinach, bread and tomato record IDs. Olive oil and garlic appeared separately as not confirmed. The response asked the user to check current condition; it did not claim safety or consumption. Proposal remained pending and Kitchen stock did not change.
- **D3 share handoff:** opened “Share it instead?” from the meal card and loaded the canonical 250 g Kitchen record. The form displayed `Your reminder · 2026-10-20`, the recorded storage note as illustrative/unverified and “Safety · Not assessed.” No offer was published because no physical food was available to inspect and truthfully declare suitable. This is an intentional acceptance boundary.
- **D4 natural-language clarification:** Gemini interpreted “vegetarian spinach for 30 people within 5 km, pickup within 4 hours” and asked how many portions per person it should use. It did not assume a serving size. A complete natural-language request proceeded to deterministic matching and returned “No eligible offer combination” because no eligible nearby offers were available. No plan or reservation was created. Google Routes remains unconfigured, so no driving time/order claim was produced.
- **D5 receipt:** the existing receipt evidence remains historical acceptance of the canonical ledger, not a new plan in this run. Retry-after-success and concurrent-claim acceptance remain open.

## Verification

- `pnpm lint` — passed.
- `pnpm exec tsc --noEmit` — passed.
- `pnpm build` — passed, including optimized compilation, TypeScript validation and static page generation.
- Backend `python -m compileall -q app` — passed after the household fix and recovery client/normalization changes.
- FastAPI route registration/OpenAPI import — passed in the organization assistant implementation lane.
- `git diff --check` — passed for the final code and documentation snapshot.
- No unit tests were added or run. Local assistant health reports Vertex configured/enabled, but `runtime_check=not_performed`; the active local service still uses unmanaged in-memory sessions. This is not managed Sessions/Agent Runtime acceptance.

## Remaining gates

- Prepare real, donor-reviewed eligible food offers for the multi-stop organization plan. The target of six donors and twelve offers is not complete. Do not record synthetic items as confirmed donor condition, public availability or successful pickup.
- Configure/verify Google Routes before describing route times or stop ordering as driving routes.
- With eligible offers, accept two meaningfully different plans, explicit choice/reservation, shortage math, receipt, retry idempotency and concurrent quantity protection.
- Verify D1 no-match/ambiguous behavior and inspect the deployed path separately. No deployment was changed by this session.

Current pointers: [README demo accounts/status](../../../README.md#demo-accounts), [demo flow remediation plan](../../planning/DEMO_FLOW_REMEDIATION_PLAN.md), [implementation status](../../STATUS.md), [architecture](../ARCHITECTURE.md), [past mistakes](../PAST_MISTAKES.md), and [decisions](../DECISIONS.md).
