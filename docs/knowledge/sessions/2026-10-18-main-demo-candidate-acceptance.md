# Main AI demo deployment and live acceptance — 18 October 2026

## Scope and deployed commits

Pushed the prepared AI demo on the configured GitHub remote `origin` (`aashikvilla/ecoloop`) to `main`. Main implementation commits:

- `11b8720` — prepared AI recovery demo flows, realistic synthetic Bengaluru accounts/data, documentation and no-traffic candidate workflow.
- `270542e` — normalized model-supplied proposal policy fields after strict typed parsing.
- `8f87d66` — always send the visible NGO pickup deadline as structured input.

GitHub Actions candidate runs [39137324178](https://github.com/aashikvilla/ecoloop/actions/runs/39137324178) and [39137786168](https://github.com/aashikvilla/ecoloop/actions/runs/39137786168) passed. The first authenticated household turn against run 39137324178 returned `AGENT_INVALID_RESPONSE`; it exposed that the typed card passed parsing but model policy fields failed server checks. After server-side normalization, the same household request returned HTTP 200 against the exact `8f87d66` candidate.

The final main deployment run [39138555396](https://github.com/aashikvilla/ecoloop/actions/runs/39138555396) passed candidate build, deployment and HTTP/auth smoke checks, then was manually promoted after household and organization AI turns passed. API `ecoloop-api-00041-gul` and web `ecoloop-web-00025-yud` each receive 100% of traffic. Deployed `/api/v1/health` and `/account` returned HTTP 200.

## AI and Routes acceptance

- **Household recipe:** Firebase sign-in succeeded with the README synthetic Asha account. The exact-candidate `/api/v1/assistant/turns` request returned HTTP 200 and a `MealSuggestion` titled “Spinach and Potato Curry”. Spinach, potatoes, onion and ginger were mapped to the confirmed item IDs in Asha's Kitchen. A separate food-action proposal was returned for the selected spinach. No mutation was performed. Post-turn health reported `vertex_ai_verified` and `managed_sessions=true`.
- **Organization request:** Firebase sign-in succeeded with the README synthetic NGO account. Its saved pickup base and actual offer-discovery records were used. The natural-language request in `docs/AI_DEMO_DATASET.md`, plus the visible form's explicit deadline of 19 October 2026 at 19:00 IST, returned HTTP 200 with `status=plans`. Gemini extracted `spinach`, `1,500 g`, `vegetarian`, and `5 km`. Two deterministic quantity plans covered all 1,500 g using three or four discovered offers. The twelve records remain visibly synthetic, non-reservable rehearsal scenarios; no offer or lifecycle record was changed. Proposal `route_status` remains `unavailable` because these proposal options use straight-line distances and do not call Routes.
- **Google Routes:** `GOOGLE_MAPS_ROUTES_API_KEY` is distinct from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. The server key is restricted to Routes API, stored as Secret Manager `ecoloop-google-maps-routes:1`, and readable only by `ecoloop-api-runtime`; it is also present in ignored `backend/.env` locally. A direct Routes `computeRoutes` request between synthetic Bengaluru coordinates returned 2,958 m and 646 s. The live reservation-based route endpoint is configured, but this check does not mean the NGO AI proposal cards are driving routes.
- **Photo purchase check:** prior local synthetic spinach-photo check passed and matched against the confirmed 250 g pantry record without mutation. The deployed endpoint was not repeated during this deployment.
- **Surplus and verified receipt:** Kitchen-linked surplus prefill is implemented and was locally reviewed. No offer was published because no physical food was available for the donor to inspect and truthfully confirm. No synthetic scenario was reserved, collected, or recorded as impact. Fresh operational reserve/receipt and retry/concurrency acceptance remain open.

## Configuration and safeguards

- The workflow now keeps push deployments on no-traffic candidate revisions. Manual `workflow_dispatch` with `promote=true` is required after live household and organization turns are accepted against the same commit. Revision selection uses the candidate's traffic-tagged revision name.
- API candidate uses Vertex AI, managed ADK Sessions, Memory Bank disabled, maximum one Cloud Run instance, and an application cap of 12 AI requests per user/day. Managed Agent Runtime is not deployed.
- Existing GitHub Actions variables already supplied Firebase browser settings, Workload Identity Federation/deployer identity, Agent Engine ID, and public browser Maps key. The API itself uses its Cloud Run identity for Vertex AI; no Gemini key is needed. Routes is mounted via Secret Manager rather than a GitHub Actions variable. The account list and synthetic passwords are in root `README.md`; key setup guidance is in `docs/implementation/google-maps-keys.md`.
- The documented project billing review found a ₹2,000 monthly alert but no hard all-services spend ceiling; credits and live billing visibility remain unknown. Do not raise the request cap or scale instances without reviewing billing/cost controls.

## Verification and lessons

Frontend `pnpm lint`, `pnpm exec tsc --noEmit`, production `pnpm build`; backend `.venv/Scripts/python.exe -m compileall -q app`; GitHub workflow YAML parsing; and `git diff --check` passed. No unit tests were run per the project contract.

The first live turn showed that health/configuration checks do not prove an AI action response. Proposal policy fields (`scope`, status, simulation, and allowed actions) now come from server policy after strict typed card parsing. The organization form always sends its visible deadline, so the assistant does not need to guess locale-specific date phrases.

## Pointers

[Current status](../../STATUS.md), [demo dataset and prompt](../../AI_DEMO_DATASET.md), [Maps keys and setup](../../implementation/google-maps-keys.md), [deployment workflow guide](../../implementation/main-branch-auto-deploy.md), [decisions](../DECISIONS.md), and [past mistakes](../PAST_MISTAKES.md).
