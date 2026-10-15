# EcoLoop technical architecture — high level

**Status:** proposed design for review, not an approved deployment or implementation claim. **Date:** 15 October 2026. **Scope:** sustainability coordination platform, food first, with separately gated ecosystem modules. Read with [low-level contracts](04_TECHNICAL_LLD.md), the product document, journeys, decision register and implementation checklist in this directory. Technical source provenance and conflicts are recorded in [the source review](research/TECH_SOURCE_REVIEW.md).

## 1. Architecture intent and the starting position

EcoLoop should help a person or organization turn fragmented resource information into a feasible decision, obtain the right approvals, coordinate a permitted handoff, and record what actually happened. The reusable platform is identity, evidence, confirmed state, policy, proposals, partner exchange and outcome measurement. Food, organics, repair, utilities and compute remain distinct domains with different physical constraints. A general chat interface is an optional entry point; it cannot replace operational records or authorization.

The checked-in application is currently an industrial-material catalog scaffold. `frontend/src/app/page.tsx` contains client fetching and fallback examples; `backend/app/api/v1/endpoints/items.py` has a process-local catalog and unauthenticated mutations. These observations are static, not runtime findings. The planned tenant model, approval engine, Google AI workflow and durable resource ledger are not present in those modules. No environment secrets were read and no application code was changed for this design.

Preserve the existing `/frontend`, `/backend`, `/docs` organization. The earlier sprint handoff's `/apps/web` and `/services/api` layout is a possible organization, not a reason to migrate a small repository. The newer master specification and ADR-015 supersede earlier Flutter and Vite recommendations. Keep Next.js App Router, Python FastAPI, Google ADK, Gemini via Vertex AI, Firestore and Cloud Storage as the proposed core.

## 2. Boundaries and component responsibilities

Start with a **modular monolith**: one backend codebase with explicit modules and one API deployment. Add an independently secured worker entry point from the same codebase when durable asynchronous work is introduced. This retains shared contracts and transactional consistency while allowing costly inference or partner jobs to have separate concurrency limits. A separate service per lane would add network failure modes before teams or workloads justify them.

| Component | Responsibility | Authority it does not receive |
|---|---|---|
| Next.js frontend | Accessible role workspaces, candidate editing, review, status and evidence display | Granting roles, certifying food, approving on behalf of a person |
| FastAPI application layer | Authentication, tenant context, request validation, use-case orchestration | Trusting browser-supplied role or tenant without checks |
| Domain modules | Quantities, stock changes, cutoffs, state transitions, eligibility prerequisites | Inferring missing measurements or universal safety thresholds |
| ADK coordinator | Interpret ambiguity, ask for clarification, select scoped tools, explain verified results | Direct canonical writes, unrestricted URLs, partner credentials |
| Firestore | Versioned canonical records, membership, approvals, jobs and audit references | Treating model conversation history as inventory |
| Cloud Storage | Consented media and approved evidence artifacts | Public bucket discovery or permanent unbounded uploads |
| Partner gateway | Capability checks, previews, approved execution and reconciliation | Assuming MCP availability means authorized transaction access |
| Reporting layer | Traceable operational metrics and evaluation comparisons | Converting every positive UI action into environmental savings |

The logical flow is: **browser → authenticated API → evidence/candidate → human confirmation → canonical facts → deterministic evaluation + bounded AI explanation → immutable proposal → authorized approval → simulation or permitted action → independently recorded outcome**. At every arrow the receiver validates the source and current record version. A donation and an organic processing load share provenance infrastructure, but have different records, participants and policy rules.

## 3. Domain design for an ecosystem

Identity and access owns organizations, memberships, roles and consent. Evidence owns source references and extracted candidates. Resource operations owns dated stock, plans, batches and measurements. Decisions owns previews, expiry and approvals. Exchange owns explicit inter-organization sharing and transfer reservations. Outcomes owns observations, verification status and attribution. Evaluation owns fixtures, runs and comparative results. Domain modules call application interfaces, not each other's collection paths.

Food is the first implementation slice: household plan changes (J-H01), kitchen batch changes (J-K01) and eligible surplus coordination (J-R01). Organics (J-O01) adds collection, acceptance, process and output records after operator access. Utility, energy, water, repair and compute journeys reuse the common approval and evidence machinery only after their product gates. They must define their own units, accepted evidence, decision owners and failure handling; a single `eco_score` is unsuitable.

Cross-resource abstraction should stop at common envelopes. A food batch requires handling records and human eligibility review. A repair asset requires ownership, condition and repair outcome. A water meter requires calibration, location authorization and interval readings. Represent each with a typed domain payload, not an ever-growing object containing hundreds of optional fields.

## 4. Tenant and inter-organization trust model

REQ-AUTH-01: a verified Firebase user identity is necessary but not sufficient. Every operation checks active membership in the selected EcoLoop organization, the required role, resource ownership and relevant consent. Token tenant claims and server membership must agree where the claim is present. Distinguish an EcoLoop organization from a Google Identity Platform authentication tenant; they are not automatically the same identifier.

A user may belong to a household and work for a kitchen. The workspace selector selects among authorized memberships; it cannot create a role. A demo role switch uses isolated synthetic identities and data. Support staff have no ambient access to private inventories or vulnerable recipient details. Any exceptional support access requires a bounded reason, named actor, expiry and audit.

The ecosystem uses **permissioned exchange**, not shared access to all tenant records. A donor publishes a minimal offer projection with explicit purpose, selected recipient organizations, permitted fields and expiry. A receiving NGO can inspect that projection and its own acceptance record; it cannot query the donor's household, staff roster or procurement history. Personal addresses are disclosed only to a permitted actor at the operational stage that requires them.

A `ShareGrant` authorizes a specific projection and workflow. Revocation prevents future reads and execution, invalidates related proposals, and requests deletion of optional copies. It cannot erase information already lawfully seen or evidence subject to retention duties; this limitation belongs in consent copy. Within one EcoLoop database, reservations can use transactions. External partners require a reconciled workflow because no Firestore transaction can atomically commit a merchant order or physical handoff.

Firestore server libraries bypass client Security Rules, so backend authorization and least-privilege IAM remain mandatory. Client rules should deny canonical writes and initially deny direct reads as well; permitted projections can be added later with independent rules verification. [Firebase server access guidance](https://firebase.google.com/docs/firestore/security/rules-conditions)

## 5. Frontend and API trust boundary

Use Server Components by default for the public site, navigation shell, help and non-sensitive presentation. Keep interactive candidate editors, authenticated workspace data loading, upload progress and approval controls as focused Client Components. For the first slice, client requests send Firebase ID tokens to FastAPI over HTTPS. Private server rendering can be added through a deliberately designed session boundary later; do not casually forward an unverified browser cookie as trusted identity.

FastAPI owns all domain mutations. Server Actions, if later introduced, remain authenticated callers of the same backend contracts, with CSRF and origin defenses appropriate to cookie authentication. They must not create a second policy implementation. Generate the TypeScript client from reviewed OpenAPI when implementation begins. Client validation improves feedback; server validation decides validity.

Every view has loading, empty, partial, error and success states. Show last confirmed time, unresolved assumptions, source type and simulation state beside the decision. Before approval, show the exact quantities, recipient, fees when relevant, expiration and reversible versus physical consequences. A delayed or failed request displays its operation identifier and refresh option; users must never infer success from a disappearing spinner.

## 6. Evidence, facts, memory and policy

REQ-FACT-01 separates four kinds of information. Raw evidence is what the user submitted or an approved source supplied. Candidates are model or parser interpretations. Canonical facts are human-confirmed, dated records. Preferences are optional user choices. Neither conversation summaries nor retrieval memory can overwrite current stock or partner capacity.

Media upload is an authorized intent followed by private object upload and server validation. Check content type, size, ownership, checksum and processing status. Treat OCR text, document instructions and remote partner descriptions as untrusted data. Extract only the fields needed for the current task; location histories, entire inboxes and unrelated household records are not justified inputs.

REQ-POL-01: maintain reviewed policy bundles with jurisdiction, source URL, effective date, applicability, review date, owner and rules version. Begin with a small versioned rule table and source links. Retrieval can help locate and explain a policy after the corpus and user questions justify it; it cannot publish a new rule. A missing, expired or conflicting rule produces a blocked review state. This document deliberately defines no universal food temperature, elapsed-time or cooking cutoff threshold.

Human food-safety eligibility review, temperature evidence and recipient confirmation remain required. Passing a deterministic prerequisites check means the necessary evidence has been recorded; it does not certify microbiological safety. Plate leftovers and spoiled food cannot become recovery offers by relabeling them.

## 7. GenAI and model operations

The first AI capability is structured extraction of a receipt or changed-plan note into editable candidates. A single ADK coordinator can then obtain confirmed facts and request allowlisted calculations. Explanations must use tool outputs and identify missing facts. The coordinator receives actor context from the server; tenant scope is never a model-selected privilege.

Separate tool categories into read, calculate and propose. Human confirmation and approval endpoints are not exposed as autonomous model tools. Tool names describe business abilities clearly, such as reading confirmed context or calculating portions. Avoid dozens of overlapping narrow tools and avoid a generic execute-anything tool. Each tool has typed inputs, output limits, time limits and an authorization wrapper.

Model selection is configuration controlled by an evaluation record, not a hardcoded claim about the newest model. Verify the exact Vertex model, region, SDK, quota, structured-output support and pricing in the actual project before selecting it. Compare a lower-cost model against a higher-capability candidate on the same held-out cases. Escalation is bounded; no repeated model loop until an answer appears plausible. Manual correction remains available during provider errors.

Google documents structured output and ADK deployment on Cloud Run, but those capabilities do not establish that EcoLoop has deployed them or that extracted content is true. [Structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output), [ADK Cloud Run deployment](https://adk.dev/deploy/cloud-run/)

## 8. Durable jobs, action execution and real-time updates

Short deterministic reads can remain synchronous. Media parsing, extended evaluation, evidence deletion/export and external reconciliation should use durable operation records when they outlive a normal request. Return `202` with an operation ID; persist pending work before acknowledging it. A browser closing does not imply cancellation, and a request timing out does not imply that an effect failed.

When asynchronous work becomes necessary, use an outbox: one Firestore transaction records the domain change, audit event and pending job. A dispatcher sends an authenticated Cloud Task, and a reconciler discovers unprocessed outbox records. The worker claims the job with a lease and checks deduplication before work. Repeated dispatch is expected. Cloud Tasks can deliver duplicates and does not guarantee execution order; handlers must be idempotent and enforce state transitions independently. [Cloud Tasks behavior](https://docs.cloud.google.com/tasks/docs/common-pitfalls)

Never call a provider inside a Firestore transaction. Transaction callbacks can rerun; they should only read, validate and write transactional data. A remote timeout after order submission produces `RECONCILIATION_REQUIRED`, not a new order. Provider idempotency and status lookup are required before enabling a real effect. [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

The initial user experience uses short, bounded polling of authorized operation or resource versions, with backoff and a visible updated timestamp. This meets collaborative status needs without pretending a Markdown plan is automatically synchronized. Later, add tenant-scoped Server-Sent Events or read-only Firestore projections only when measurements show polling is insufficient. Events carry resource IDs and versions rather than sensitive content, and clients refetch authorized state. Connections must reconnect and recover missed updates; Cloud Run streaming connections have timeout and instance coordination considerations. [Cloud Run streaming guidance](https://docs.cloud.google.com/run/docs/triggering/websockets)

## 9. Physical actions and partner adapters

REQ-ACT-01 requires an immutable preview and explicit authorized human approval. Approval is bound to the action payload, source record versions, policy version, recipient, price where relevant, simulation mode and expiry. Any change forces a new preview. Recheck permissions and material constraints immediately before execution; earlier approval is not an indefinite authorization.

Each adapter declares supported capabilities, credentials status, permitted scopes, sandbox support, idempotency support and status-query behavior. Simulation is the default. Mock results carry `simulated: true` and fictional partners throughout API, UI, audit and evaluation. An adapter cannot silently fall back from live mode to synthetic success.

Food transfer additionally needs donor authority, human eligibility review, NGO capacity, recipient acceptance and custody evidence. Each organization approves its own responsibility. A courier's pickup scan cannot substitute for recipient acceptance. An organics processor confirms accepted, rejected and processed quantities separately. Connected actors do not automatically imply a connected physical service.

MCP is optional transport for permitted tools. A provider announcing a server is insufficient evidence of EcoLoop access, approved commercial use, supported identity flow or execution rights. Integrate only after official onboarding, sandbox verification, scopes and reconciliation behavior are recorded. Keep provider secrets outside model context and disable live execution by an operational kill switch independent of prompts.

## 10. Storage, measurement and analytics

Firestore holds transactional state; Cloud Storage holds raw media and larger evidence; deidentified exports feed BigQuery after useful reporting volume exists. Avoid a dependency on BigQuery for basic household actions. All records carry source, observation time, recording time, actor, schema version and evidence status. Append corrections instead of silently rewriting historical measurements.

REQ-IMPACT-01: measurement method, evidence authenticity and environmental attribution are separate dimensions. A manually weighed quantity can be recorded without independent verification. A delivered kilogram is not a consumed kilogram. Collected organics are not necessarily processed, and processed wet mass does not equal dry compost output. A suggested reduction is not observed avoided waste.

Use grams for food mass, millilitres for volume, item counts for discrete units, and native meter units for utility observations, with explicit conversions. No mass-volume conversion without an approved density or measured conversion. Record uncertainty and instrument resolution; reject negative quantities except explicitly typed correction events. Carbon and water claims need a reviewed methodology, factors, baseline, boundaries and additional burdens. Until then, report quantities and unknown impact, not a combined sustainability score.

Retention is purpose based: source media, extracted candidates, confirmed records, operational audit and evaluation exports each need a documented duration and deletion rule before real data launch. Immutability means controlled historical correction, not permanent personal data retention. Deletion must cover derivatives, exports, indices and caches; an audit may retain minimal legally justified metadata without retaining the sensitive payload.

## 11. Deployment, reliability and operational controls

Use separated development, demo and future production projects or equivalently strong environment boundaries. Do not import real household or recipient data into the demo. Firebase App Hosting supports Next.js, but the exact package/runtime combination must be checked against its support schedule. The repository pins Next.js 16.4.1 while the retrieved support table explicitly lists older supported series; compatibility is unresolved, not a reason to assume deployment succeeds. [App Hosting framework support](https://firebase.google.com/docs/app-hosting/frameworks-tooling)

Cloud Run instances are disposable. No canonical state, SQLite session database, job ledger or durable file may depend on the container filesystem. Use service identities and Application Default Credentials, scoped IAM and Secret Manager. Keep the public user API logically separate from private worker endpoints requiring service authentication. Restrict CORS to approved origins, validate uploads, rate-limit costly operations and enforce per-tenant AI budgets. [Cloud Run runtime contract](https://docs.cloud.google.com/run/docs/container-contract)

Proposed experience targets are a responsive shell within two seconds on the agreed test device/network, immediate acknowledgment of long operations, and visible progress or failure. These are acceptance targets, not observed performance or SLAs. Set p50/p95 budgets after benchmarking real cold starts, model latency and Firestore access. Record maximum input size, worker concurrency, request timeout and token budget as tested configuration.

Structured logs contain request ID, pseudonymous tenant/actor references, operation, policy version, outcome code, latency and token/cost metadata. Exclude tokens, full receipts, personal schedules and recipient addresses. Alert on authorization violations, outbox age, execution-unknown actions, policy expiry, error rate and spend. Rollback restores a compatible application revision; data migrations require expand/contract schemas and a separate recovery plan. Backups require an actual restore rehearsal before promising recovery objectives.

## 12. Feasibility, tradeoffs and release evidence

The engineering path is feasible for a narrow prototype because managed identity, storage and inference reduce infrastructure work. The broader platform's feasibility depends more on data rights, partner capacity, workflow adoption and measurement than on adding agents. A working household flow can validate technical integration; it cannot prove safe recovery operations or sustained physical waste reduction.

| Choice | Initial recommendation | Revisit when |
|---|---|---|
| Firestore vs relational database | Firestore for bounded document workflows already chosen | Complex cross-organization reporting or transaction contention makes joins/constraints decisive |
| Modular monolith vs microservices | Monolith plus bounded worker | Independent scaling, security ownership or release cadence is measured |
| Polling vs persistent streams | Polling with resource versions | Measured collaboration latency or read cost exceeds agreed targets |
| ADK vs direct structured call | Direct parser plus one bounded coordinator | Comparative evaluation identifies which steps need tool selection |
| Rule table vs RAG | Reviewed rule table | Larger authorized corpus makes retrieval materially useful |
| Manual baseline vs AI | Preserve both | AI wins correctness or effort without safety regressions |

Release evidence must include tenant-isolation attempts, stale approval rejection, duplicate submission behavior, model-outage fallback, restart recovery, candidate correction persistence and the complete human review journey. Compare the same raw artifacts across manual/rules, ordinary Gemini and the integrated workflow. Use held-out cases and report failures alongside averages. Zero critical failures in a declared test suite is a release gate, not universal proof of safety.

The next implementation decision is a bounded end-to-end slice, not a simultaneous launch of all modules. Keep shared contracts stable and leave partner actions simulated until permission and operational evidence exist. This design supplies the seams needed for expansion without making expansion a prerequisite for learning.
