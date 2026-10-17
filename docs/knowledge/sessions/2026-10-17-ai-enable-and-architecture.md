# AI enablement, architecture and hackathon scoring — 17 October 2026

## User intent

The owner asked to enable EcoLoop's AI and exercise the product path, prepare HLD/LLD architecture diagrams, and reassess theme fit, GenAI substance, social-impact scope and the judging rubric with an honest low-effort/high-value improvement plan.

## Work and evidence

- Read current project authority and latest Cloud Run acceptance record; no actual household data was used.
- Used same-project Vertex AI in `ecoloop-staging-20261015`. Granted `roles/aiplatform.user` to `ecoloop-api-runtime`. Cloud Run API reports Vertex enabled and configured; isolated revision `ecoloop-api-00007-59g` is tagged `ai-test`, while stable traffic remains pinned to release revision `ecoloop-api-00008-men`.
- Isolated candidate settings: Gemini `gemini-3.1-flash-lite`, global Vertex endpoint, 58-second model timeout, 1,024 output-token cap, three requests per user per day. A direct text-only model request from local ADC succeeded in 12.4 seconds (16 total tokens). This proves model/project connectivity, not product integration.
- Two prior signed-in synthetic-user product requests reached the Cloud Run ADK assistant endpoint but failed with sanitized 504 timeouts: one at 20 seconds and one at 50 seconds. No proposal approval or post-generation stock/shopping mutation occurred. Test accounts, households and four synthetic pantry facts were created before those calls and remain disposable test artifacts.
- A planned final attempt at 58 seconds did not run: local helper execution stopped because the Firebase public web config was not available in the process. It did not create another account or invoke the model. Do not report a successful deployed product AI journey.
- Added `backend/scripts/cloud_ai_acceptance.py`, a narrowly scoped synthetic-only acceptance helper that requires explicit `--apply`, a fixed test origin, ADC, and public Firebase config. Its final bounded invocation could not proceed as described above.
- Updated `.github/workflows/deploy-main.yml` defaults to 50-second model timeout, 2,048 output tokens, and three requests per user/day for future workflow-built releases. This change is local/uncommitted and does not alter a deployed revision until a future release workflow runs.
- Created [PRODUCT_HLD_LLD.md](../../architecture/PRODUCT_HLD_LLD.md), with HLD component/data boundaries and LLD Ask-to-explicit-approval sequence. Labeled Vertex as configured but product inference unaccepted; managed Sessions, Memory Bank, Agent Runtime and browser media remain unavailable/unverified.

## Hackathon evaluation

Official AI Builder Cup JAPAC sources were checked on 17 October 2026:

- Theme page: https://aibuildercup.com/themes.html
- FAQ: https://aibuildercup.com/Faqs.html
- Terms linked from the official home page: https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub

Sustainability & Social Impact is a challenge lane; the four weighted rubric criteria apply across themes. EcoLoop's food/resource efficiency use case fits. Adding live food redistribution now would introduce safety, recipient, temperature, capacity and operations obligations without stronger prototype evidence; keep sharing as an explicitly owner-private record/simulation and describe community benefit as prospective.

EcoLoop is substantively a GenAI product when Gemini uses confirmed household facts to generate grounded candidate meal/BuyCheck proposals. The proposed write boundary is credible: deterministic API validates scope/versions, fixed card schemas render the response, and a person explicitly approves actions. However, in the current environment only a direct Vertex request worked. The product's authenticated Cloud Run ADK call timed out; do not claim the deployed product AI currently works end to end.

Rubric estimate remains 52/100: Technical Merit & GenAI 19/40, Problem Alignment & Impact 14/25, Innovation & Creativity 13/25, UX & Design 6/10. A reasonable uncertainty band is 45–60, not an official prediction. Lowest-effort high-value move is to repair and record one deployed authenticated AI Ask turn that returns a grounded typed card and durable history readback, then show the explicit approval boundary in the demo. Next, include a tiny honest user observation or baseline; never claim avoided waste or carbon without evidence. Do not add BigQuery/Earth Engine or real redistribution just to decorate the architecture.

## Eligibility and authorship caveat

FAQ says 21+, working professionals/entrepreneurs/startups only, JAPAC-based, teams of 2–4; cross-country teams inside JAPAC are allowed, solo registration can precede joining a team, but final building roster changes after 14 October are not allowed. Terms further say members must be physically based in and legal residents of JAPAC and permit eligibility verification. Team ages/status/residency/registered roster and originality provenance have not been validated here.

The official materials contain no express ban on Codex or coding assistants. Terms do require fresh work within the stated timeline, prohibit third-party-rights misuse and represent the participant as sole author/copyright owner. Codex has materially assisted implementation in this repo. The text does not clarify AI-assisted coding authorship; disclose use accurately and ask the organizer for a written ruling before making an unqualified authorship representation. FAQ/challenge copy says video under/around three minutes, while linked terms say strictly three to four minutes; terms state they prevail over inconsistent promotional materials. Seek clarification and use the organizer's written answer.

## Architecture decision and follow-up

Same-project Vertex is the selected provider path; local ADC diagnostic succeeded, Cloud Run ADK integration remains unresolved. The Cloud Billing budget is alert-only, not a hard cost ceiling. No commit, push, promotion, external message, or actual-user AI call was made. See [Decision](../DECISIONS.md) and [Architecture](../ARCHITECTURE.md).

## Follow-up — managed context and AI timeout (17 October 2026)

- Confirmed `AI_DAILY_REQUEST_LIMIT=3` came from EcoLoop's deployment workflow. Feature branch/candidate revision `ecoloop-api-00020-dop` uses 12 per authenticated UID per UTC day; stable production revision `ecoloop-api-00018-dov` remains at 3.
- A direct synthetic Agent Engine Session create/read/delete succeeded. A direct synthetic Memory Bank fact create/read/delete also succeeded; the fact and Session were deleted afterward. This proves managed service access only, not app-level consent/revocation or the assistant flow.
- Candidate authenticated app acceptance created a disposable Firebase user, household and confirmed food facts, then the Gemini/ADK call timed out at 50 seconds with HTTP 504. Cleanup removed the synthetic account, household, AI usage record and managed Session. No user data was used.
- Candidate health reports managed services configured but unverified; production still reports in-memory Sessions and Memory Bank disabled. Keep the rollout gate false. Do not report app AI as working end to end or promote this candidate.
- The configured model remains Gemini 3.1 Flash-Lite with MINIMAL thinking. It is already a low-cost model choice; one timeout is not evidence Gemma will solve the issue. Next task is to diagnose/fix the authenticated ADK request latency, then rerun the bounded candidate acceptance before promoting managed context.
- No production promotion/deployment, real-user AI call, paid model retry or unit test was made. The candidate workflow/deployment and direct managed-service smoke are recorded in `docs/planning/AGENT_PLATFORM_PLAN.md`.

## Follow-up — latency instrumentation (17 October 2026)

Added privacy-safe, bounded JSON timing records in `backend/app/agents/household.py` for the assistant request path. Timed phases are Kitchen, preferences, optional Memory Bank, saved plans, runner initialization, session preparation, daily usage reservation, ADK run, response validation, plus total request time and first ADK event. The record includes counts and allowlisted tool names only; it excludes prompts, record values, IDs for users/households, and provider error payloads. The next candidate run can distinguish pre-run delay from an ADK/tool/model stall and show whether any event or tool call completed before timeout.

`uv run --locked python -m compileall -q app` and `git diff --check` passed. No unit tests, live provider calls, deployment or production changes were made. Instrumentation remains on the pushed feature branch until candidate deployment is authorized.
