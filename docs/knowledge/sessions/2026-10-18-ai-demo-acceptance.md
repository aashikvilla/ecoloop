# AI demo enablement and acceptance — 18 October 2026

## Scope

Enabled the local backend against Vertex AI for bounded demo verification. No project settings, deployment, committed changes, public offers, reservations, receipts, or confirmed Kitchen stock were changed. Existing README demo identities and synthetic Kitchen facts were used. No real household or donor data was sent.

## Runtime

- Local frontend: `http://localhost:3000` with command flows enabled for this development run.
- Local API: `http://127.0.0.1:8006`, configured for Vertex AI project `ecoloop-staging-20261015`, global location, `gemini-3.1-flash-lite`, minimal thinking, and a 60-second request ceiling. Health returned `healthy`, `assistant.enabled=true`, and provider `vertex_ai`.
- Health also reports `runtime_check=not_performed`, `session_store=in_memory_unmanaged`, `managed_sessions=false`, and `managed_memory=false`. This does not prove Agent Engine/managed Sessions or Memory Bank readiness.
- No real `.env` file was read. The API was restarted with `ECOLOOP_DISABLE_DOTENV=true` and explicit temporary process environment configuration.

## Feature results

| Flow | Result | Evidence and limits |
| --- | --- | --- |
| Photo intake extraction | **Pass, candidate only** | Gemini returned an unconfirmed spinach candidate for the synthetic photo. The UI stated the image was not saved and Kitchen stock was unchanged. One unconfirmed intake draft was created; no confirmed record was added. |
| Shopping photo → pantry comparison | **Pass, one matching case** | Gemini identified spinach. The authenticated flow reread Kitchen and found the confirmed 250 g Spinach record, then recommended using that recorded food before buying more. It made no Kitchen write. The screen was captured as visual evidence for the working D1 moment. No-match and ambiguous-match cases remain unverified. |
| Use-soon contextual meal suggestion | **Fail** | Authenticated Ask returned `AGENT_TIMEOUT` at 45/60 seconds with Gemini 3.5 Flash-Lite, then again at 60 seconds with Gemini 3.1 Flash-Lite (request ID `47331aaeb6564d9faa40dd884ba104c4`). UI displayed the assistant unavailable state. A direct text request and a minimal ADK smoke had succeeded previously, so this is isolated to the full product-agent turn path; root cause remains unknown. Raising the ceiling or changing lightweight models did not resolve it. |
| Meal decline → surplus offer | **Not end-to-end accepted** | Source contains the handoff and Kitchen-linked review form. Meal suggestion prerequisite failed; no offer was published because there was no physical surplus food to inspect and attest. |
| Organization AI request interpretation | **Not implemented** | Organization request uses structured deterministic fields, not Gemini natural-language parsing. Organization dashboard was accessible; zero open eligible offers were found within 5 km. No plan, reservation, or claim was created. |
| Actual route timing | **Not available** | Google Routes key is not configured. The current planner uses approximate straight-line distance/order; no driving-time route claim is supported. |
| Receipt and impact | **Not retested in this run** | Previously recorded receipt acceptance remains documented in the demo review. No new handover was represented as real. Retry-after-success and concurrency acceptance remain open for this branch. |

## Source changes and checks

- `backend/app/domain/photo_intake.py`: translated the Pydantic response schema to the subset accepted by the Google GenAI SDK while preserving strict local Pydantic validation. This unblocked the Gemini photo flow.
- `backend/app/agents/household.py`: when Vertex is selected, removes competing Developer API keys from the process environment before ADK initializes its Google GenAI client; also resolves meal ingredient labels against the confirmed Kitchen snapshot before citing records.
- `backend/.venv/Scripts/python.exe -m compileall -q app` — passed.
- `git diff --check` — passed.
- `pnpm lint` — passed.
- `pnpm exec tsc --noEmit` — passed.
- No unit tests were added or run, per project contract.

## Readiness conclusion

The local product-photo AI moment is showable with the prepared consumer account. Do not claim that the complete household AI loop works: the full ADK Ask path still times out, the organization agent/parser is not implemented, routes are unavailable, and there are no fresh eligible pickup offers. Keep the prepared consumer Kitchen dates labeled as user reminder targets, not expiry dates. The branch remains local and unmerged; no deployment occurred.

## Decision and architecture pointers

No architecture decision changed. Follow the existing ADK timeout decision and the gated work in [the demo remediation plan](../../planning/DEMO_FLOW_REMEDIATION_PLAN.md). The next engineering step remains root-cause diagnosis of one authenticated product-agent request, with bounded per-phase metrics and request-correlated traces, before claiming D2 acceptance.
