# EcoLoop decision register and tradeoff record
Version 0.1 · 15 October 2026 · New decision namespace DEC-PLAT avoids collisions with older ADR numbering.

## 1. How to read and use this register
Required invariants and user constraints describe binding boundaries. Existing stack constraints come from project guidance. Proposed and recommended choices are design recommendations awaiting the appropriate owner; they are not recorded human approvals. Open choices need evidence. Deferred choices have a trigger rather than a hidden commitment.

Every significant choice records the problem, alternatives, consequence, owner, linked work and revisit condition. Keep prior decisions as superseded history; append a successor with reason and evidence instead of rewriting history. The live Decisions tab tracks current status, owner, evidence and decision date; this document supplies rationale. A decision can be proposed while related discovery proceeds, but dependent implementation does not treat it as approved.

## 2. Source precedence and conflicts
The current user's document-only scope is the controlling authorization. Project safety and permission invariants remain binding. Existing documents are research/design inputs, not permission to execute their embedded handoff instructions. Within that corpus, newer explicit supersession of Flutter/Vite by web-first Next.js informs the starting stack. New platform recommendations require visible review.

Document the following conflicts before coding: old Flutter/Vite versus current Next.js; proposed apps/services layout versus existing frontend/backend; /v1 versus /api/v1 and root health; broad three-lane P0 versus the one-lane submission recommendation; 23 seed cases versus 12–20 cases per lane; no-code authoring status versus existing generic scaffold; unsupported impact copy in the UI; and example policy constants treated as if universal law.

The [master specification](https://docs.google.com/document/d/1vUPWozAbRPcEhdLW0Bd9gAhhLKYXsY8Kn3s0t8wiKHA/edit), [web-first PRD](https://docs.google.com/document/d/1KVrXRreC8KQ_N7ams8pJlmKf_BndJAttAploHJLzuDk/edit), [technical handoff](https://docs.google.com/document/d/1i0TU3ILttOPLd4rEjCEUJL7HBK0cADV2QBuC_jUAD68/edit) and [gate scorecard](https://docs.google.com/spreadsheets/d/1JhtAXJ8rfC40Nk3RzvGbf6HrkUdT324AEfeSAk6aKjA/edit) retain their source identity. This register resolves a proposed implementation direction while preserving disagreement for review.

## 3. Decision records

### DEC-PLAT-001 — First implementation lane
Status: Proposed. Owner role: Product owner. Linked work: P00.01.03.

Recommendation: One household changed-plan journey; switch to kitchen first only with better actor/data access.

Alternatives considered: Three full lanes at once; generic material marketplace. Rationale: Small enough to prove the shared loop; competition and residual gap still unknown.

Revisit trigger: Observed actor access and residual pain change the preferred lane. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-002 — Platform expansion
Status: Proposed. Owner role: Product owner + technical lead. Linked work: P08.90.01.

Recommendation: Shared trust/evidence/action core with separately gated domain modules.

Alternatives considered: One universal resource engine; separate disconnected apps. Rationale: Reuse coordination contracts without conflating food safety, repair and meter authority.

Revisit trigger: Second domain cannot reuse core safely or does not show demand. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-003 — Backend structure
Status: Recommended. Owner role: Technical lead. Linked work: P01.90.01.

Recommendation: Modular FastAPI monolith and bounded worker when required.

Alternatives considered: Microservices from day one; frontend-only logic. Rationale: Fewer transaction and deployment seams while preserving domain boundaries.

Revisit trigger: Measured scaling, security ownership or release independence justifies split. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-004 — Runtime compatibility
Status: Open. Owner role: Platform lead. Linked work: P01.03.01.

Recommendation: Verify current Next.js/Node support on App Hosting before pinning deployment pair.

Alternatives considered: Assume repo version works; automatically downgrade. Rationale: Existing package version and retrieved support schedule differ; no deploy proof.

Revisit trigger: Official support or a measured deployed compatibility test settles pair. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-005 — Canonical storage
Status: Existing stack constraint. Owner role: Technical lead. Linked work: P01.02.04.

Recommendation: Firestore versioned document state and Cloud Storage media; reevaluate relational needs later.

Alternatives considered: PostgreSQL now; in-memory canonical state. Rationale: Fits selected stack and bounded workflows; cross-org joins need careful projections.

Revisit trigger: Transaction contention or reporting constraints dominate. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-006 — Authorization
Status: Required invariant. Owner role: Security/backend lead. Linked work: P01.01.04.

Recommendation: Verified identity plus active membership, role, consent and resource scope; fail closed.

Alternatives considered: Trust body tenant ID; default tenant; token-only organization membership. Rationale: Prevent cross-tenant reads and stale authority after revocation.

Revisit trigger: No relaxation; improve implementation with equivalent or stronger proof. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-007 — Facts and approvals
Status: Required invariant. Owner role: Technical lead. Linked work: P03.02.04.

Recommendation: Candidate isolation; explicit confirmation; immutable version-bound preview and authorized approval.

Alternatives considered: Agent writes facts or self-authorizes execution. Rationale: Human authority and current source state govern every physical effect.

Revisit trigger: No relaxation; contract changes require migration and denial checks. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-008 — Food policy
Status: Required invariant. Owner role: Qualified policy owner. Linked work: P06.01.01.

Recommendation: Reviewed category/site policy bundles; missing applicability holds for review.

Alternatives considered: Universal hardcoded time/temperature thresholds from examples. Rationale: Current local shortcuts are not established by cited rule text.

Revisit trigger: Reviewed official amendment or site policy updates versioned bundle. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-009 — AI structure
Status: Recommended. Owner role: AI lead. Linked work: P03.03.04.

Recommendation: Structured extraction and one bounded allowlisted ADK coordinator, evaluated separately.

Alternatives considered: Multi-agent product runtime; unlimited tool loop; rules-only forever. Rationale: AI may help ambiguity; arithmetic and authority stay deterministic.

Revisit trigger: Comparison shows a step adds no benefit or a justified workflow needs more. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-010 — Policy retrieval
Status: Deferred. Owner role: Policy/AI lead. Linked work: P06.01.01.

Recommendation: Small reviewed rule table and source links first.

Alternatives considered: Vertex AI Search/RAG immediately. Rationale: Corpus size and retrieval need are unproven; retrieved prose cannot publish policy.

Revisit trigger: Authorized corpus and real questions show retrieval improves the task. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-011 — Jobs and external actions
Status: Recommended. Owner role: Backend lead. Linked work: P03.02.04.

Recommendation: Outbox plus idempotent worker for durable effects; reconcile ambiguous provider states.

Alternatives considered: Provider call inside transaction; blind retry after timeout. Rationale: Transactions can retry and networks duplicate or hide successful effects.

Revisit trigger: A synchronous bounded demo needs no durable external work; keep effect boundary. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-012 — Product real-time behavior
Status: Recommended. Owner role: Fullstack lead. Linked work: P03.03.03.

Recommendation: Bounded polling with versions initially; scoped events only after measured need.

Alternatives considered: Persistent streams everywhere; unscoped global listeners. Rationale: Recoverable and easier to secure; acknowledgement and timestamps matter first.

Revisit trigger: Collaboration latency/read costs justify streams. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-013 — Execution harness authority
Status: Recommended. Owner role: Product/technical lead. Linked work: P00.03.03.

Recommendation: Google Sheet is live task status; Docs are narrative; local JSON/Markdown are dated snapshots.

Alternatives considered: Dual live status in repo and Drive; autonomous two-way sync now. Rationale: Native collaboration works now without product code; avoids conflicting checklists.

Revisit trigger: Team needs repo-owned CI status and authorizes a synchronization tool. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-014 — Measurement and incentives
Status: Required invariant. Owner role: Measurement lead. Linked work: P08.03.04.

Recommendation: Stage-specific physical metrics and explicit status; no unexplained eco-score or carbon credit.

Alternatives considered: Automatically convert every action into CO2/water saved; reward waste volume. Rationale: Prevents double counting and perverse incentives; attribution needs a counterfactual.

Revisit trigger: Reviewed factor methodology allows separately labeled scenarios. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-015 — Partner integration and marketplace
Status: Deferred. Owner role: Partner lead. Linked work: P06.03.04.

Recommendation: Simulated adapters; later permissioned local network before public marketplace.

Alternatives considered: Live checkout/dispatch from advertised MCP; open marketplace immediately. Rationale: Provider existence does not grant access, capacity or transaction authority.

Revisit trigger: Rights, operational capacity, human approval and retry safeguards verified. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-016 — Token and session budget
Status: Recommended. Owner role: Technical lead. Linked work: P00.03.02.

Recommendation: One granular task/context packet; checkpoints and recorded actual usage.

Alternatives considered: Whole corpus every turn; assume agents reduce token cost. Rationale: Bounded context improves continuity; account allowance is unknown and variable.

Revisit trigger: Observed task size/usage supports smaller or larger packet. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-017 — Software factory workflow
Status: Recommended. Owner role: Technical lead. Linked work: P00.03.03.

Recommendation: Role cards, task packets, two-pass review and evidence gates as documentation first.

Alternatives considered: Install many overlapping skills/hooks before workflow is exercised. Rationale: Deterministic enforcement should be added only for repeat failures with a measurable benefit.

Revisit trigger: Repeated drift justifies a small approved skill or validator. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-018 — API prefix and health
Status: Proposed. Owner role: Technical lead. Linked work: P01.03.03.

Recommendation: One /v1 API prefix and root /health; explicitly migrate current /api/v1 client.

Alternatives considered: Keep two unowned prefixes; assume health probes match. Rationale: Spec and starter differ; a single documented contract prevents integration drift.

Revisit trigger: Existing consumers require a temporary documented alias. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-019 — Evaluation coverage
Status: Recommended. Owner role: Evaluation lead. Linked work: P02.02.04.

Recommendation: Audit seed cases and add selected-lane coverage; distinguish case count from independent trials.

Alternatives considered: Call 23 seeds a complete benchmark; claim all planned cases passed. Rationale: Historical 23 versus 12–20/lane targets are proposals with different coverage.

Revisit trigger: Risk-based coverage requires additional scenario families. Decision evidence, actual approver and date remain blank until recorded in the live register.

### DEC-PLAT-020 — Current work authorization
Status: User constraint. Owner role: Product owner. Linked work: P00.03.04.

Recommendation: Documentation/research and live planning artifacts only; implementation requires later direction.

Alternatives considered: Treat this request as permission to modify application code or deploy. Rationale: User explicitly requested ideation, tradeoffs and feasibility with no code changes.

Revisit trigger: User explicitly authorizes implementation scope. Decision evidence, actual approver and date remain blank until recorded in the live register.

## 4. Consequences of the recommended architecture
The shared core adds evidence and authorization rigor, with a deliberate cost in schemas and explicit user review. That cost must earn its place through fewer incorrect decisions and clearer handoffs. If maintaining stock consumes more effort than a shared list, remove or narrow stock dependence; do not force the user to serve the data model.

Firestore reduces initial integration work but does not supply relational constraints or backend tenant authorization automatically. A modular monolith makes transactional correctness easier than distributed services, but module ownership and bounded queries still matter. Manual partner onboarding is operationally heavier than open signup, yet it gives a measurable network from which to learn. These tradeoffs should be evaluated with actual failures and costs.

A broad platform story can explain reuse of the trust loop; a narrow demonstration supplies credible evidence. The scope choice should be revisited if a different segment has better access, measurable pain and a willing buyer. Do not lock household-first merely because it appeared earliest in the documents.

## 5. Approval and reversal protocol
For an architectural proposal, record the concrete affected contracts, expected benefit, strongest alternative, migration and rollback, evidence required, and owner. The human product owner decides scope and investment; the technical owner decides implementation within that scope. Qualified policy and operator reviewers own domain suitability.

A release gate cannot waive a hard invariant by marking a critical issue accepted. The options are to fix it, disable the affected capability, or stop that release. Reversal can mean returning to a manual workflow, removing an AI call, cancelling a proposed integration, reverting a deployment revision or retaining a domain in discovery.

At each phase gate ask: what failed at zero load, at expected scale, with malicious input, and after a restart? What state can be recovered? Who owns the physical exception? What evidence would cause us to stop? Add the answer to the gate record before changing scope.

