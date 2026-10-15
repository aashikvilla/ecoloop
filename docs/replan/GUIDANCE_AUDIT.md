# Guidance audit for the consumer replan

Date: 15 October 2026. Scope: static, read-only audit of existing guidance, historical planning, prototype and application baseline. This audit creates only this report. It does not run example programs, tests, deployments or application code.

## Decision evidence and precedence

The latest local evidence is the consumer experience document [25](evidence/1c17S-l0UEsaOy1ooG2UVnW9D_V6BEprdkNK_j0N8CM4.txt), especially sections 12–15 and its final consumer UX addendum, plus [technical decision document 17](evidence/1Rq4oHM-h3bFaX_OfL0f7aZGqhyCWUuBsxP6m9YXvMk8.txt), ADR-015–019, and [consumer demo document 26](evidence/10Bjw3MNzVuRm_eu2kXh2ffnkAGt8Ys18-WpNOQ1AmOA.txt). These are source records, not live implementation proof. Parent work must separately establish the linked chat's accessibility and any later decisions.

Current product: a household food assistant, solo first, optional family sharing, four main destinations Home / Kitchen / Ask / Shopping. Core loop is capture → review candidates → confirm facts → contextual suggestion/typed card → explicit approval → recorded outcome. Consumer source explicitly excludes corporate, NGO and processing operator products from this version. Many screen IDs describe sheets/states rather than independent page projects.

Simplifying product scope must preserve the latest explicit technical choices:

- Next.js App Router and Firebase App Hosting; authenticated FastAPI authority on Cloud Run; Google ADK and real Gemini.
- Managed Agent Platform Sessions and opt-in Memory Bank are core. Demonstrate an approved preference surviving two distinct sessions. Firestore holds authoritative stock, dates, actions and outcomes; Memory Bank holds scoped preferences only.
- Agent Platform Runtime is preferred. Technical ADR-016 allows ADK on Cloud Run with Memory Bank only after an explicit technical blocker and identical functional proof. Do not silently demote managed memory to an optional future feature.
- Typed interactive chat cards are P0. Begin with a small allowlisted React component catalog. A2UI package adoption and SSE are optional; arbitrary model-generated HTML/JavaScript is prohibited.
- Show recorded actions separately from measured/logged outcomes. No invented kg saved, money saved, CO2e, water or composite eco score.

The latest consumer source supersedes the older broad platform blueprint for current scope. It does not erase historical records or imply external research claims are verified. Stitch screens govern visual direction; conflicting placeholder quantities, freshness claims, integrations, navigation or impact counters require reconciliation with consumer constraints.

## Root files and knowledge

| File | Recommendation | Reason / required replacement |
|---|---|---|
| `AGENTS.md` | Replace active product contract | Current contract binds all work to the master spec, three roles/lanes, FSSAI operations and 23-case runner. Keep safety, candidate confirmation, deterministic arithmetic, permission and evidence boundaries; redirect active authority to the consumer replan, reference Stitch, and add managed memory/typed UI constraints. Remove claims that all existing skills are production-grade. |
| `GEMINI.md` | Replace with short pointer plus shared technical constraints | Useful typing/async/privacy constraints survive, but old endpoint assumptions, fixed model temperature advice and lack of Sessions/Memory Bank/typed UI no longer describe the current design completely. Avoid two independent active product contracts. |
| `README.md` | Replace product overview and add current-plan link; retain accurate scaffold run commands | It currently presents a material recycling platform. Clearly distinguish current generic scaffold from planned household assistant; preserve factual local URLs until implementation changes. |
| `docs/knowledge/ARCHITECTURE.md` | Update current pointer; retain dated history | Currently promotes broad blueprint as proposed architecture and omits managed memory/core chat cards. |
| `docs/knowledge/DECISIONS.md` | Update active decision authority; retain DEC-PLAT register as superseded | P00 first-lane uncertainty is resolved by narrowed consumer scope; avoid reopening it each session. |
| `docs/knowledge/PAST_MISTAKES.md` | Keep and add supersession lesson | Existing warnings about unsafe defaults, duplicate status authorities and unchecked evidence remain applicable. |
| `docs/knowledge/README.md` | Keep structure; refresh navigation | Session continuation should find the current consumer packet first. |
| `docs/knowledge/sessions/2026-10-15-platform-blueprint.md` | Preserve unchanged; add new replan journal | A historical delivery record should remain truthful. Add explicit successor link rather than rewriting what happened. |

## Rules: each active file

| File under `.agents/rules/` | Recommendation | Detail |
|---|---|---|
| `01_hard_invariants.md` | Replace narrowly | Keep no AI food-safety certification, candidate isolation, explicit confirmation, simulated commerce and fail-closed access. Move donation-specific legal disclaimer and eligibility taxonomy to deferred research. Current household flow should not require an NGO dispatch warning on every interaction. Scope reminders by date type/uncertainty. |
| `02_stack_and_deployment.md` | Replace | Preserve Google stack, stateless API, server secrets and health intent. Add managed Sessions / Memory Bank / Runtime authority and fallback conditions. Drop old hard-coded Gemini IDs; select from available verified model capability at implementation. Do not assume all active chat sessions live in Firestore. |
| `03_evaluation_and_benchmarks.md` | Replace | Test current household journey plus candidate correction, stale stock, memory consent/scope, typed UI validation and approval conflict. Three-method comparison is a bounded later evidence exercise where useful; every algorithm change need not run the entire historical multi-lane protocol. Keep honest reporting of synthetic versus live results. |
| `04_coding_standards_and_architecture.md` | Keep engineering core; rewrite domain examples | Keep typing, clear boundaries, concise functions, validation and explicit errors. Remove mandatory physical mass accounting for every state change: incomplete household observations cannot establish a closed material balance. No silent pantry decrement from meal suggestions. Remove logging of input summaries where private schedules/receipt details could leak. |
| `05_nextjs_react19_standards.md` | Replace visual/token section and clarify mutation boundary | Dark slate/neon mandate conflicts with warm, light Stitch direction. Keep accessible mobile layouts, semantic components and secret isolation. Server Actions are an implementation option; they must not duplicate/bypass FastAPI authority. Shell deterministic; chat uses typed components. |
| `06_agent_driven_development_harness.md` | Keep purpose; simplify and correct claims | Keep contract-first units, bounded context, session handoff and actual evidence. Remove unsupported numerical claim that type signatures yield 80% fewer hallucinations. A universal under-200-lines mandate creates arbitrary fragmentation; use focused units and reviewable change size. |
| `07_gcp_cloud_observability_ci_cd.md` | Replace with staged operations | Minimal redacted request/tool traces, latency, token/cost and conflict evidence first. Defer broad custom monitoring/traffic-splitting infrastructure until deployment warrants it. Remove requirement that the historical `eval_runner.py` proves 100% correctness. A mock cart is not avoided money; confirmed diversion is not a metric of household suggestions. Label latency as a target until measured. |

## Agents: each active file

| File under `.agents/agents/` | Recommendation | Detail |
|---|---|---|
| `ecoloop_orchestrator.md` | Replace current prompt | Keep one orchestrator, deterministic tools, approval and no autonomous commerce. Replace institutional cutoff and physical scale tools with consumer capture, relevant confirmed facts, portion adjustment, shopping draft, approved outcomes and scoped preference memory. Add typed UI schema response and forbidden-action checks. ADK selection and managed context must be real before claimed. |
| `intake_extraction_agent.md` | Retain capability; revise interaction | Keep candidates, units and injection resistance. Do not discard all legitimate extraction just because an image also contains injected instructions. Represent uncertain field/date type; use the shared confirmation sheet and scoped media retention. A separate deployed agent is unnecessary; this can be an extraction capability/tool. |
| `evaluation_benchmark_agent.md` | Replace | Remove fixed 23-case scope and 95% universal target. Separate deterministic household cases, actual model traces and release gates; exercise cross-user memory isolation, deletion, malformed cards and denied approval. No score can be inferred from a source report or fabricated comparator. |

## Skills: all ten entrypoints

These recommendations are content audits, not invocation of their workflows. All referenced snippets are guidance, not permission or verified application code. An active entrypoint must explicitly supersede conflicting references/examples, or those assets should be moved under clearly marked historical guidance. A top-level disclaimer alone is weak if automatic skill descriptions still trigger the old lane.

| Skill | Recommendation for entrypoint | Reference/example disposition |
|---|---|---|
| `fastapi-cloudrun-service` | Keep; rewrite auth and household API examples | Remove kitchen/recovery routes from baseline layout. Quarantine `examples/auth_dependency.py` and replace inline example before reuse: both invent missing tenant/role defaults; example has unauthenticated development bypass and swallows initialization failures. Keep authenticated fail-closed boundaries. No source project ID, region or deploy command is authorization. |
| `firebase-fullstack-integration` | Keep; update data and context split | Add membership checks, consented preference memory separate from Firestore facts, explicit version/conflict and media deletion. Existing hierarchy is illustrative, not a valid implemented schema. Infrastructure examples must use environment parameters rather than assumed project identity. |
| `google-adk-orchestration` | Replace core tutorial | It currently teaches Cloud Run/Firestore sessions and kitchen tools. Update for managed Runtime/Sessions/Memory Bank and typed cards. `examples/orchestrator_example.py` invokes `google.genai` directly and contains no ADK Runner/Agent/session lifecycle: it is not evidence of ADK. Quarantine as historical sketch. |
| `gemini-multimodal-structured` | Keep with narrow revisions | Keep official SDK, schema validation and photo safety limits. Add per-field unknown/candidate state, date types and confirmation. Model-reported confidence is not calibrated confidence. Avoid fixed obsolete model IDs and treating low temperature as determinism. No raw image becomes memory automatically. |
| `ecoloop-domain-engine` | Replace active scope with consumer rules | Archive K/R and historical 23-case references. Preserve useful household edge cases as inputs for an independently executable current suite. Remove universal 45-minute, four-hour, 65°C and 5°C claims from active household guidance. `examples/eval_runner.py` cannot prove agent quality; see critical finding below. |
| `nextjs-app-router-mastery` | Keep framework principles; replace scope examples | Remove `(dashboard)/household/kitchen/recovery` baseline and add Home/Kitchen/Ask/Shopping states and sheets. Example unauthenticated mutation transport is incomplete. Match Stitch tokens; do not introduce a second generic dashboard. |
| `gcp-cloud-observability` | Keep as optional/staged operations skill | Minimal privacy-safe tracing/cost/latency is useful. Full OpenTelemetry exporters and custom business metrics are conditional implementation steps, not blockers to first household loop. Never count a shopping suggestion as realized saving. |
| `continuous-verification-cicd` | Keep purpose; replace unsafe gate | Remove historical benchmark as CI proof and separate verification from deployment. An illustrative workflow must not combine a fabricated agent score with production rollout. Build only the current subset, stage real cloud proof explicitly, and parameterize environment. |
| `systems-thinking-domain-modeling` | Defer broad modeling; keep measurement honesty | Archive emission-factor table and default conversion example from active guidance. `examples/mass_balance_calculator.py` uses hard-coded category/default factors without sufficient counterfactual/provenance. P0 logs events/known amounts and unknowns; it does not require complete mass balance or carbon accounting. |
| `vertex-ai-search-agent-garden` | Defer policy-RAG/model-garden workflow | FSSAI policy datastore and model deployment are outside current household MVP. Do not replace this with an assumption that managed Sessions/Memory Bank are optional: those are distinct core requirements in the latest source. Keep policy research as future reference, not startup dependency. |

## Critical evidence traps in examples

1. `.agents/skills/ecoloop-domain-engine/examples/eval_runner.py`: the Method C branch unconditionally increments `passed` for every fixture. Method B outcomes are also assigned from assumptions rather than actual calls. This is a simulation sketch, not comparative testing. A green exit or 23/23 from this file must never be a release gate or reported ADK result.
2. `.agents/skills/fastapi-cloudrun-service/SKILL.md`: missing verified tenant becomes `default-tenant` and missing roles become `household_member`. `examples/auth_dependency.py` additionally synthesizes tenant from UID and allows missing-token development access. Replace defaults with explicit membership lookup and denial; seeded demos need a distinct isolated boundary.
3. `.agents/skills/google-adk-orchestration/examples/allowlisted_tools.py`: default cooking cutoff is 45 minutes; absent price becomes INR 50. These values are synthetic assumptions. They cannot produce user-facing verified expiry/cost or prevent preparation that already started.
4. `.agents/skills/systems-thinking-domain-modeling/examples/mass_balance_calculator.py`: hard-coded factors plus fallback category generate carbon estimates without reviewed provenance/counterfactual. The latest source explicitly excludes unsupported automatic carbon scoring.
5. `docs/planning/STITCH_PROMPTS.md`: old prompt set prescribes dark operator screens, expiry inference, fixed food safety windows, fabricated FSSAI/NGO identity and a 1.9 kg CO2e/kg factor. This file must not guide current design generation.

## Document and prototype supersession map

| Existing material | Disposition |
|---|---|
| `docs/ECOLOOP_MASTER_PRODUCT_SPEC.md` | Historical master; replace active entry with consumer pointer or archive intact with superseded label. Preserve hard safety/evidence principles, not old breadth. |
| `docs/PRODUCT_CAPABILITIES_MATRIX.md` | Archive broad O1–O4 matrix; current replacement maps only household jobs to screens/contracts/proof. |
| `docs/SYSTEMS_THINKING_ARCHITECTURE.md` | Archive broad physical/operator architecture. Keep feedback/unknown-stock insights as bounded notes, without 45-minute universal deadline. |
| `docs/planning/00_START_HERE.md` | Replace active entrypoint; prominently link current replan and historical blueprint. |
| `docs/planning/01_PRODUCT_STRATEGY.md` through `09_RESEARCH_SYNTHESIS.md` | Preserve historical blueprint set under an archive label/location; replace current authority with consumer product/journeys/HLD/LLD/decisions/phases/feasibility/harness. Do not silently mutate historical claimed proof. |
| `docs/planning/TASKS.json` | Historical snapshot of broad 156-unit plan; mark superseded and introduce current IDs. Never carry old completion state into new plan merely because docs exist. |
| `docs/planning/DELIVERY_MANIFEST.json` and `artifacts/` | Preserve as dated delivery evidence; add successor pointer, avoid treating as active task state. |
| `docs/planning/STITCH_PROMPTS.md` | Archive old operator design prompts; current screenshots/HTML plus reconciled consumer requirements guide implementation. |
| Broad Drive blueprint Docs and Sheet | Preserve originals; mark superseded and redirect to current consumer plan/tracker. Do not erase old decisions or test records. Parent owns Drive updates. |
| `prototype/index.html` | Preserve as historical interactive prototype, clearly labeled obsolete. Dark styling, recovery/dispatch lane and fake impact counters are inconsistent. Do not use as consumer implementation or erase untracked work. |
| `docs/prototypes/` and `docs/prototypes.zip` | Preserve the user-supplied Stitch assets intact. They are design references, not runnable product or factual proof. Resolve duplicated desktop/mobile folders and internal token differences through a design map; do not delete arbitrarily. |

The organic-modernism `DESIGN.md` has two palette descriptions (frontmatter sage-tinted canvas and prose oatmeal canvas) and unrelated Shop / Circular Loop / Impact / Bag navigation. Use specific requested household screen screenshots and latest four-tab consumer navigation for the current flow. Preserve warm typography, tactile surfaces and accessible target sizes. Container return/refund components, fake metric numbers and claims of AAA contrast are illustrative; they do not establish current scope or tested accessibility.

## Application baseline and rollback safety

`git log --oneline -- frontend backend` contains only `3456570` (initial scaffold). Recent commits changed docs/guidance, not a previous consumer implementation. Current `frontend/src/app/page.tsx` presents generic material cards and localhost API calls; `backend/app/api/v1/endpoints/items.py` contains an in-memory material catalog. No code rollback to a prior household product is supported by this history.

There is substantial untracked material: `docs/planning/*`, `docs/knowledge/`, `docs/prototypes/`, `docs/prototypes.zip`, `docs/replan/` and `prototype/`. Do not run `git clean`, hard reset or mass revert to simplify planning. The safe authorized operation is explicit guidance supersession and archival, retaining source designs and history. A future implementation unit can deliberately replace scaffold features after reviewing current code.

The research engineering logs in source document 19 report ZIP artifacts and tests in another environment, including a later 18-case set. Those reported runs are not local repo implementation or proof. Preserve their useful failure cases (stock drift, timestamps, quantity integrity, preparation stage) as design inputs; require fresh executable evidence when implemented here.

## Minimal completion checklist for guidance reconciliation

- [ ] Establish latest linked-chat decisions and authoritative consumer source versions.
- [ ] Create one current replan entrypoint and explicit list of superseded material.
- [ ] Update root AGENTS/GEMINI/README and knowledge pointers to the same authority.
- [ ] Replace all seven active rules and three agent contracts as mapped above.
- [ ] Update ten skill entrypoint descriptions so discovery does not revive superseded scope.
- [ ] Quarantine unsafe/historical examples and prohibit them as verification/deployment gates.
- [ ] Preserve old blueprint documents, tracker and prototype with visible successor links.
- [ ] Map requested Stitch screens to four destinations and reusable sheets; resolve asset contradictions explicitly.
- [ ] Maintain managed Sessions, opt-in Memory Bank, typed GenUI and runtime fallback gate in the new plan.
- [ ] Confirm new leaf tasks require specific outputs/evidence and start unchecked.
- [ ] Record the replan session, supersession decision and prevention lesson.

No runtime verification is claimed by this audit. Its evidence consists of file inspection, source-text comparison and Git history/status inspection.
