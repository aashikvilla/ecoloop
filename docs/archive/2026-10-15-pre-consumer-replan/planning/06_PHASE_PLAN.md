# EcoLoop phased implementation plan and granular checklist
Version 0.1 · 15 October 2026 · Proposed work breakdown; 12 phases, 36 workstreams and 156 leaf units including 12 phase gates.

## Execution contract
This is the readable plan snapshot. The Google Sheets harness linked from the control room is the authoritative live status record. Every checkbox below starts unchecked because producing a plan does not implement or approve it. Record completion, evidence, reviewer and update time against the stable unit ID in the tracker; refresh this snapshot deliberately rather than maintain two independent status systems.

The current request authorizes documentation and ideation. P00 includes an explicit scope/implementation authorization unit. Later coding, deployment, real partner activity and submission are future tasks with their own relevant authority. An implementation agent receives only an authorized task packet and its prerequisites.

## Roadmap and dependency map
P00 planning acceptance -> P01 trusted foundation -> P02 deterministic baseline -> P03 household AI integration -> P04 deployed demo/submission.
After P04, kitchen P05, recovery P06 and permissioned pilot P08 can be planned as separate work streams; shared-owner capacity still limits concurrency. P07 organics follows the recovery/partner governance work in this conservative plan. P09 repair/reuse, P10 energy/water and P11 ecosystem scale depend on evidence from P08. These are gates, not promised dates or a commitment to build every module.

P00–P04 are the submission path. Image/audio, PWA, elaborate analytics, live merchants, policy RAG, forecasting and additional full lanes are cut before trust checks or the core end-to-end flow. If real access is unavailable, keep fixture data conspicuously synthetic and report the limit. Never check a physical outcome based on a simulation.

## Unit sizing and completion
Each unit has one observable output and acceptance condition. Before starting, assign a named owner, independent reviewer where appropriate, estimate and a bounded context packet. Default reading budget is 6,000 tokens per unit; phase gates use 4,000. These are planning allowances and exclude hidden/internal overhead, tool outputs and actual model usage. Record actual usage when available; no account limit is assumed.

Completion requires exact evidence for the accepted version: output/run ID or file/link, reviewer, update date, complete status, checked completion box and verified prerequisites. A broad screenshot cannot substitute for a missing authorization or race-condition check. If an output changes, reopen affected work and preserve prior evidence as history.


## P00 — Planning and scope approval
Horizon: Planning. Entry dependency: None; current scope is documentation only. Exit: P00.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P00.01 — Product and evidence
Owner role: Product owner. Assign an actual owner before execution.

- [ ] **P00.01.01 Review source inventory and conflicts**
  Acceptance: Coverage and contradiction register acknowledged; source gaps have owners.
  Evidence: Research inventory + product source review. Prerequisites: none.

- [ ] **P00.01.02 Select initial actor and decision window**
  Acceptance: Named cook/buyer, authority and before-cooking trigger documented.
  Evidence: Product strategy scope decision. Prerequisites: P00.01.01.

- [ ] **P00.01.03 Approve one-lane demo boundary**
  Acceptance: Household path chosen or alternative documented; other lanes staged.
  Evidence: Signed scope decision DEC-PLAT-001. Prerequisites: P00.01.02.

- [ ] **P00.01.04 Define success and stop conditions**
  Acceptance: Decision correctness, effort and zero unsafe actions defined before trial.
  Evidence: Pilot/benchmark acceptance record. Prerequisites: P00.01.03.

### P00.02 — Constraints and access
Owner role: Technical lead. Assign an actual owner before execution.

- [ ] **P00.02.01 Verify contest eligibility and deadline**
  Acceptance: Official terms, roster status and exact cutoff uncertainty recorded.
  Evidence: Official source URLs and eligibility note. Prerequisites: none.

- [ ] **P00.02.02 Inventory cloud and model access**
  Acceptance: IAM, billing, region, quota and supported runtime verified without exposing secrets.
  Evidence: Redacted access checklist. Prerequisites: P00.02.01.

- [ ] **P00.02.03 Review food policy and measurement assumptions**
  Acceptance: Unsupported universal thresholds/cutoffs rejected; reviewer named.
  Evidence: Policy discrepancy register. Prerequisites: P00.02.02.

- [ ] **P00.02.04 Approve privacy and partner boundaries**
  Acceptance: Consent, public-repo data exclusion and simulated-only adapters specified.
  Evidence: Privacy/partner decision record. Prerequisites: P00.02.03.

### P00.03 — Execution setup
Owner role: Technical lead. Assign an actual owner before execution.

- [ ] **P00.03.01 Review HLD and LLD against scope**
  Acceptance: Auth, versions, approvals, idempotency and failure contracts agreed.
  Evidence: Technical design review. Prerequisites: none.

- [ ] **P00.03.02 Assign owners and estimates**
  Acceptance: Named owner, reviewer and effort for first executable work packet.
  Evidence: Updated tracker rows. Prerequisites: P00.03.01.

- [ ] **P00.03.03 Exercise harness status and recovery**
  Acceptance: Checkbox alone cannot verify; dependencies and evidence gates recalculate.
  Evidence: Harness verification record. Prerequisites: P00.03.02.

- [ ] **P00.03.04 Authorize implementation phase**
  Acceptance: Human authorizes coding scope; document-only restriction explicitly lifted.
  Evidence: Authorization record. Prerequisites: P00.03.03.

### P00.90 — Phase exit review

- [ ] **P00.90.01 Review and accept planning and scope approval**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P00.01.04, P00.02.04, P00.03.04.

## P01 — Trusted foundation and contracts
Horizon: Demo. Entry dependency: P00.90.01. Exit: P01.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P01.01 — Identity and permissions
Owner role: Backend engineer. Assign an actual owner before execution.

- [ ] **P01.01.01 Define membership and permission matrix**
  Acceptance: Each protected operation maps actor, tenant and permission.
  Evidence: Auth contract REQ-AUTH-01. Prerequisites: P00.90.01.

- [ ] **P01.01.02 Implement verified identity boundary**
  Acceptance: Missing/invalid token rejected; tenant never defaults.
  Evidence: Auth check evidence. Prerequisites: P01.01.01.

- [ ] **P01.01.03 Implement current membership and revocation checks**
  Acceptance: Revoked membership fails even with a still-valid token.
  Evidence: Revocation and wrong-tenant evidence. Prerequisites: P01.01.02.

- [ ] **P01.01.04 Prove denial across roles and tenants**
  Acceptance: Read/write isolation and guessed IDs tested.
  Evidence: Negative authorization matrix. Prerequisites: P01.01.03.

### P01.02 — Canonical records
Owner role: Backend engineer. Assign an actual owner before execution.

- [ ] **P01.02.01 Define typed records and units**
  Acceptance: Candidate, fact, proposal, evidence, outcome schemas include version and provenance.
  Evidence: Schema review. Prerequisites: P00.90.01.

- [ ] **P01.02.02 Define tenant paths and server-only writes**
  Acceptance: No global list or browser mutation bypass; server IAM assessed.
  Evidence: Firestore access design. Prerequisites: P01.02.01.

- [ ] **P01.02.03 Implement atomic versioned confirmation**
  Acceptance: Stale version causes conflict; repeat submission does not duplicate facts.
  Evidence: Confirmation conflict evidence. Prerequisites: P01.02.02.

- [ ] **P01.02.04 Prove durable audit and restart behavior**
  Acceptance: Business state survives restart; sensitive content excluded from logs.
  Evidence: Persistence and redaction evidence. Prerequisites: P01.02.03.

### P01.03 — Runtime foundation
Owner role: Platform engineer. Assign an actual owner before execution.

- [ ] **P01.03.01 Confirm supported frontend and Node pairing**
  Acceptance: App Hosting compatibility verified for actual pinned versions.
  Evidence: Runtime matrix. Prerequisites: P00.90.01.

- [ ] **P01.03.02 Configure authenticated API client and origins**
  Acceptance: Environment URL used; production origins explicit; localhost not shipped.
  Evidence: Client/CORS evidence. Prerequisites: P01.03.01.

- [ ] **P01.03.03 Create health and deployment contract**
  Acceptance: Root health path stable; PORT and startup behavior documented.
  Evidence: Health/deployment smoke evidence. Prerequisites: P01.03.02.

- [ ] **P01.03.04 Set budgets and model call caps**
  Acceptance: Quota, maximum attempts/tokens and alerts have owners.
  Evidence: Budget configuration evidence. Prerequisites: P01.03.03.

### P01.90 — Phase exit review

- [ ] **P01.90.01 Review and accept trusted foundation and contracts**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P01.01.04, P01.02.04, P01.03.04.

## P02 — Deterministic baseline and synthetic household flow
Horizon: Demo. Entry dependency: P01.90.01. Exit: P02.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P02.01 — Decision rules
Owner role: Backend engineer. Assign an actual owner before execution.

- [ ] **P02.01.01 Specify pantry and meal change fixtures**
  Acceptance: Stock freshness, ownership, units and consumed quantities explicit.
  Evidence: Fixture definitions. Prerequisites: P01.90.01.

- [ ] **P02.01.02 Implement unit-safe quantity reconciliation**
  Acceptance: No g/ml conversion without verified factor; no negative stock.
  Evidence: Boundary-case outputs. Prerequisites: P02.01.01.

- [ ] **P02.01.03 Implement portion and cutoff rules**
  Acceptance: Zero diners and after-cutoff behavior deterministic and explained.
  Evidence: Rule-case outputs. Prerequisites: P02.01.02.

- [ ] **P02.01.04 Implement immutable simulated proposal**
  Acceptance: Snapshot versions, expiry and preview hash stored; simulated true.
  Evidence: Proposal contract evidence. Prerequisites: P02.01.03.

### P02.02 — Evaluation baseline
Owner role: Evaluation reviewer. Assign an actual owner before execution.

- [ ] **P02.02.01 Annotate household gold cases**
  Acceptance: Labels and rejection reasons independently reviewed.
  Evidence: Gold-case register. Prerequisites: P01.90.01.

- [ ] **P02.02.02 Run rules-only baseline**
  Acceptance: Fixed input fixtures and privileges; raw results retained.
  Evidence: Baseline run ID. Prerequisites: P02.02.01.

- [ ] **P02.02.03 Add adversarial and concurrency assertions**
  Acceptance: Injected text, stale facts and approval races covered.
  Evidence: Negative-case results. Prerequisites: P02.02.02.

- [ ] **P02.02.04 Define fair comparison protocol**
  Acceptance: Equivalent inputs, model budget and reporting denominator frozen.
  Evidence: Evaluation protocol. Prerequisites: P02.02.03.

### P02.03 — Human workflow
Owner role: Frontend engineer. Assign an actual owner before execution.

- [ ] **P02.03.01 Build synthetic scenario start and actor view**
  Acceptance: Demo tenant and simulated records conspicuous.
  Evidence: Scenario screen evidence. Prerequisites: P01.90.01.

- [ ] **P02.03.02 Build candidate/fact review interaction**
  Acceptance: Field changes explicit; confirm distinct from extraction.
  Evidence: Review-flow evidence. Prerequisites: P02.03.01.

- [ ] **P02.03.03 Build proposal preview and approval interaction**
  Acceptance: Actor sees quantities, uncertainty, expiry and simulation before approving.
  Evidence: Approval UX evidence. Prerequisites: P02.03.02.

- [ ] **P02.03.04 Build honest outcome journal states**
  Acceptance: Measured, simulated and unknown separated; loading/empty/error/retry shown.
  Evidence: Outcome state screenshots. Prerequisites: P02.03.03.

### P02.90 — Phase exit review

- [ ] **P02.90.01 Review and accept deterministic baseline and synthetic household flow**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P02.01.04, P02.02.04, P02.03.04.

## P03 — Gemini intake and single-orchestrator household journey
Horizon: Demo. Entry dependency: P02.90.01. Exit: P03.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P03.01 — Structured intake
Owner role: AI engineer. Assign an actual owner before execution.

- [ ] **P03.01.01 Verify allowed Vertex model and extraction schema**
  Acceptance: Actual model ID/region recorded; parse output constrained.
  Evidence: Model access and schema evidence. Prerequisites: P02.90.01.

- [ ] **P03.01.02 Implement text intake and optional image upload**
  Acceptance: Content type/size/consent validated; optional modality can be cut.
  Evidence: Upload/input evidence. Prerequisites: P03.01.01.

- [ ] **P03.01.03 Enforce candidate isolation and uncertainty**
  Acceptance: AI output never writes canonical facts; missing values remain unknown.
  Evidence: Isolation evidence. Prerequisites: P03.01.02.

- [ ] **P03.01.04 Verify injection and malformed-output fallback**
  Acceptance: Receipt instructions ignored; bounded retry then human correction.
  Evidence: Extraction adversarial results. Prerequisites: P03.01.03.

### P03.02 — Agent orchestration
Owner role: AI engineer. Assign an actual owner before execution.

- [ ] **P03.02.01 Define minimal allowlisted tool contracts**
  Acceptance: Tools receive scoped resource IDs and checked permissions.
  Evidence: Tool registry review. Prerequisites: P02.90.01.

- [ ] **P03.02.02 Implement bounded orchestrator run**
  Acceptance: Maximum turns/cost/deadline; no self-authorized execution.
  Evidence: Trace with termination evidence. Prerequisites: P03.02.01.

- [ ] **P03.02.03 Bind approval to versioned proposal**
  Acceptance: Expiry, current membership, hash and facts rechecked on approval.
  Evidence: Stale/revoked approval evidence. Prerequisites: P03.02.02.

- [ ] **P03.02.04 Make approval retries idempotent**
  Acceptance: Duplicate concurrent request yields one simulated execution.
  Evidence: Concurrency run evidence. Prerequisites: P03.02.03.

### P03.03 — Golden flow integration
Owner role: Fullstack engineer. Assign an actual owner before execution.

- [ ] **P03.03.01 Connect text to review to changed meal**
  Acceptance: Real Gemini response goes through explicit human confirmation.
  Evidence: J-H01 trace. Prerequisites: P02.90.01.

- [ ] **P03.03.02 Connect proposal to mock action to evidence**
  Acceptance: No real checkout or dispatch; visible simulated outcome.
  Evidence: J-H01 full-flow recording. Prerequisites: P03.03.01.

- [ ] **P03.03.03 Handle connectivity and cancellation**
  Acceptance: Resume from persisted state; ambiguous action state reconciled.
  Evidence: Recovery-flow evidence. Prerequisites: P03.03.02.

- [ ] **P03.03.04 Compare against rules and plain Gemini**
  Acceptance: Correctness/unsafe actions/latency/effort reported with run IDs.
  Evidence: Paired benchmark results. Prerequisites: P03.03.03.

### P03.90 — Phase exit review

- [ ] **P03.90.01 Review and accept gemini intake and single-orchestrator household journey**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P03.01.04, P03.02.04, P03.03.04.

## P04 — Google deployment and submission readiness
Horizon: Demo. Entry dependency: P03.90.01. Exit: P04.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P04.01 — Deploy core
Owner role: Platform engineer. Assign an actual owner before execution.

- [ ] **P04.01.01 Prepare App Hosting and Cloud Run manifests**
  Acceptance: Pinned runtime, secrets references and service identities reviewed.
  Evidence: Deployment config review. Prerequisites: P03.90.01.

- [ ] **P04.01.02 Deploy isolated demo environment**
  Acceptance: Public app URL and secured backend reachable; no real private data.
  Evidence: Deployment URLs and revision IDs. Prerequisites: P04.01.01.

- [ ] **P04.01.03 Verify cross-service authentication and health**
  Acceptance: Anonymous mutation and foreign tenant access fail on deployed system.
  Evidence: Deployed negative checks. Prerequisites: P04.01.02.

- [ ] **P04.01.04 Prove rollback and degraded mode**
  Acceptance: Prior revision recoverable; model outage visibly handled.
  Evidence: Rollback/degraded evidence. Prerequisites: P04.01.03.

### P04.02 — Release checks
Owner role: Evaluation reviewer. Assign an actual owner before execution.

- [ ] **P04.02.01 Verify end-to-end mobile flow**
  Acceptance: 360px flow, keyboard focus, labels, 44px targets and all states reviewed.
  Evidence: Browser evidence. Prerequisites: P03.90.01.

- [ ] **P04.02.02 Record actual performance and cost**
  Acceptance: P50/P95, model tokens, errors and cold-start caveat measured.
  Evidence: Run-specific metrics. Prerequisites: P04.02.01.

- [ ] **P04.02.03 Audit public repo and demo claims**
  Acceptance: Secrets, real data, unsupported impact and third-party rights reviewed.
  Evidence: Release review record. Prerequisites: P04.02.02.

- [ ] **P04.02.04 Review all critical failures**
  Acceptance: No unowned critical auth/safety/data-loss failure accepted.
  Evidence: Critical issue disposition. Prerequisites: P04.02.03.

### P04.03 — Submission assets
Owner role: Product owner. Assign an actual owner before execution.

- [ ] **P04.03.01 Prepare final proposal document and deck content**
  Acceptance: Problem, Google AI role, evidence and limitations align with working demo.
  Evidence: Proposal/PDF artifact. Prerequisites: P03.90.01.

- [ ] **P04.03.02 Record strictly under-three-minute demo**
  Acceptance: Public access checked; live behavior and simulations identified.
  Evidence: Final video link/duration. Prerequisites: P04.03.01.

- [ ] **P04.03.03 Validate submission packet and eligibility**
  Acceptance: Repository, URL, deck, video, track and roster checked against live terms.
  Evidence: Submission checklist. Prerequisites: P04.03.02.

- [ ] **P04.03.04 Submit and retain receipt**
  Acceptance: Authorized human submits before confirmed cutoff; receipt retained.
  Evidence: Submission confirmation. Prerequisites: P04.03.03.

### P04.90 — Phase exit review

- [ ] **P04.90.01 Review and accept google deployment and submission readiness**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P04.01.04, P04.02.04, P04.03.04.

## P05 — Institutional kitchen extension
Horizon: Expansion. Entry dependency: P04.90.01. Exit: P05.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P05.01 — Roster and preparation authority
Owner role: Product/backend team. Assign an actual owner before execution.

- [ ] **P05.01.01 Map kitchen roles and source authority**
  Acceptance: Headcount reporter cannot override chef/menu policy.
  Evidence: J-K01 role map. Prerequisites: P04.90.01.

- [ ] **P05.01.02 Model per-batch last reversible point**
  Acceptance: Chef-specified timestamp/timezone/version; no universal 45-minute rule.
  Evidence: Batch/cutoff contract. Prerequisites: P05.01.01.

- [ ] **P05.01.03 Capture and confirm attendance exceptions**
  Acceptance: Changes record source, effective date and approved diners.
  Evidence: Roster change evidence. Prerequisites: P05.01.02.

- [ ] **P05.01.04 Reject late and conflicting adjustments**
  Acceptance: Already-started/closed batch yields hold or new human decision.
  Evidence: Cutoff/concurrency cases. Prerequisites: P05.01.03.

### P05.02 — Chef and measurements
Owner role: Kitchen partner lead. Assign an actual owner before execution.

- [ ] **P05.02.01 Review dietary and nutrition constraints**
  Acceptance: Qualified operator owns approved menu and substitutions.
  Evidence: Operator-reviewed policy. Prerequisites: P04.90.01.

- [ ] **P05.02.02 Implement chef approval of batch changes**
  Acceptance: Arithmetic deterministic; prep change requires authorized chef.
  Evidence: Chef approval trace. Prerequisites: P05.02.01.

- [ ] **P05.02.03 Separate preparation unserved and plate weights**
  Acceptance: Scale/time/tare/category metadata recorded distinctly.
  Evidence: Stage measurement records. Prerequisites: P05.02.02.

- [ ] **P05.02.04 Reconcile planned versus actual served meals**
  Acceptance: Denominator actual served; unknown data not inferred.
  Evidence: Kitchen outcome calculation. Prerequisites: P05.02.03.

### P05.03 — Kitchen validation
Owner role: Evaluation reviewer. Assign an actual owner before execution.

- [ ] **P05.03.01 Annotate K-lane failure cases**
  Acceptance: Late event, diet mismatch, role escalation and double count covered.
  Evidence: K gold cases. Prerequisites: P04.90.01.

- [ ] **P05.03.02 Compare against simple headcount and batch rules**
  Acceptance: Equivalent roster and cutoff inputs used across arms.
  Evidence: K comparative run. Prerequisites: P05.03.01.

- [ ] **P05.03.03 Pilot with authorized kitchen**
  Acceptance: Site consent, workload and food-service oversight recorded.
  Evidence: Pilot protocol and permission. Prerequisites: P05.03.02.

- [ ] **P05.03.04 Choose continue revise or stop**
  Acceptance: Observed effort/correctness supports explicit decision.
  Evidence: Kitchen gate report. Prerequisites: P05.03.03.

### P05.90 — Phase exit review

- [ ] **P05.90.01 Review and accept institutional kitchen extension**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P05.01.04, P05.02.04, P05.03.04.

## P06 — Qualified recovery coordination
Horizon: Expansion. Entry dependency: P04.90.01. Exit: P06.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P06.01 — Policy and donor eligibility
Owner role: Safety/partner lead. Assign an actual owner before execution.

- [ ] **P06.01.01 Obtain qualified policy review**
  Acceptance: Jurisdiction, category, source version and effective dates recorded.
  Evidence: Policy sign-off. Prerequisites: P04.90.01.

- [ ] **P06.01.02 Implement donor evidence completeness**
  Acceptance: Unused/unserved status, custody and required handling records explicit.
  Evidence: FoodOffer schema/evidence. Prerequisites: P06.01.01.

- [ ] **P06.01.03 Block excluded or unreviewed offers**
  Acceptance: Plate/spoiled food rejected; unknown state held for review.
  Evidence: R negative cases. Prerequisites: P06.01.02.

- [ ] **P06.01.04 Require human eligibility decision**
  Acceptance: Reviewer identity and policy version persisted; AI cannot certify.
  Evidence: Qualified review record. Prerequisites: P06.01.03.

### P06.02 — Capacity and agreements
Owner role: Partner operations lead. Assign an actual owner before execution.

- [ ] **P06.02.01 Verify NGO and recipient organizations**
  Acceptance: Permissions, handling capability and contact consent documented.
  Evidence: Partner onboarding evidence. Prerequisites: P04.90.01.

- [ ] **P06.02.02 Record separate NGO and recipient acceptance**
  Acceptance: Capacity, diet, window and transport confirmed independently.
  Evidence: Acceptance records. Prerequisites: P06.02.01.

- [ ] **P06.02.03 Create scoped cross-tenant offer projection**
  Acceptance: Only approved fields shared; no donor inventory disclosure.
  Evidence: Sharing security review. Prerequisites: P06.02.02.

- [ ] **P06.02.04 Reserve capacity and revalidate at approval**
  Acceptance: Expiry, cancellation and concurrent claims prevent double dispatch.
  Evidence: Reservation race evidence. Prerequisites: P06.02.03.

### P06.03 — Custody and exception handling
Owner role: Partner operations lead. Assign an actual owner before execution.

- [ ] **P06.03.01 Record pickup delivery and accepted mass**
  Acceptance: Signed actor/time/evidence at each custody change.
  Evidence: Custody ledger. Prerequisites: P04.90.01.

- [ ] **P06.03.02 Handle partial rejection and failed delivery**
  Acceptance: No automatic reroute; accountable human chooses permitted disposition.
  Evidence: Exception walkthrough. Prerequisites: P06.03.01.

- [ ] **P06.03.03 Implement withdrawal and incident escalation**
  Acceptance: Revoked offers cannot dispatch; incidents linked to affected batches.
  Evidence: Recall/escalation evidence. Prerequisites: P06.03.02.

- [ ] **P06.03.04 Run simulation before any live pilot**
  Acceptance: R-lane red-team cases pass and physical partner authorization explicit.
  Evidence: Recovery pilot readiness report. Prerequisites: P06.03.03.

### P06.90 — Phase exit review

- [ ] **P06.90.01 Review and accept qualified recovery coordination**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P06.01.04, P06.02.04, P06.03.04.

## P07 — Organics and processor evidence
Horizon: Expansion. Entry dependency: P06.90.01. Exit: P07.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P07.01 — Accepted loads
Owner role: Processor partner lead. Assign an actual owner before execution.

- [ ] **P07.01.01 Verify local operator and accepted-material rules**
  Acceptance: Operator authorization and exclusions documented per site.
  Evidence: Operator/policy record. Prerequisites: P06.90.01.

- [ ] **P07.01.02 Capture segregated source load**
  Acceptance: Origin, category, quantity and contaminated fraction explicit.
  Evidence: J-O01 load record. Prerequisites: P07.01.01.

- [ ] **P07.01.03 Record calibrated gross tare and net weights**
  Acceptance: Units, scale, timestamp and operator attestation preserved.
  Evidence: Weigh ticket. Prerequisites: P07.01.02.

- [ ] **P07.01.04 Reject contaminated or unauthorized collection**
  Acceptance: No assumed composting route for every organic material.
  Evidence: Load rejection evidence. Prerequisites: P07.01.03.

### P07.02 — Processing chain
Owner role: Backend/operations team. Assign an actual owner before execution.

- [ ] **P07.02.01 Record collected accepted rejected and processed stages**
  Acceptance: Each stage separate; pickup never treated as processing.
  Evidence: Stage ledger. Prerequisites: P06.90.01.

- [ ] **P07.02.02 Support partial acceptance and transfer reconciliation**
  Acceptance: No duplicate mass across operator and collector views.
  Evidence: Partial-load cases. Prerequisites: P07.02.01.

- [ ] **P07.02.03 Record process outputs moisture and unresolved residual**
  Acceptance: Boundary/time basis explicit; no naive wet-to-dry equality.
  Evidence: Mass-balance analysis. Prerequisites: P07.02.02.

- [ ] **P07.02.04 Attach auditable processor receipt**
  Acceptance: Source/evidence identity and dispute state visible.
  Evidence: Processing evidence. Prerequisites: P07.02.03.

### P07.03 — Circularity validation
Owner role: Evaluation reviewer. Assign an actual owner before execution.

- [ ] **P07.03.01 Define counterfactual before diversion claims**
  Acceptance: Destination alternatives and evidence requirements recorded.
  Evidence: Measurement protocol. Prerequisites: P06.90.01.

- [ ] **P07.03.02 Test receipt extraction against human entry**
  Acceptance: AI benefit measured on multilingual/inconsistent documents.
  Evidence: O-lane comparison. Prerequisites: P07.03.01.

- [ ] **P07.03.03 Run authorized operator pilot**
  Acceptance: Collection cost, reject rate and missing receipts measured.
  Evidence: Pilot dataset. Prerequisites: P07.03.02.

- [ ] **P07.03.04 Approve only substantiated reporting**
  Acceptance: Collected/processed/estimated/unknown labels remain separate.
  Evidence: Outcome claims review. Prerequisites: P07.03.03.

### P07.90 — Phase exit review

- [ ] **P07.90.01 Review and accept organics and processor evidence**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P07.01.04, P07.02.04, P07.03.04.

## P08 — Permissioned pilot and operating model
Horizon: Pilot. Entry dependency: P04.90.01. Exit: P08.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P08.01 — Pilot design
Owner role: Research lead. Assign an actual owner before execution.

- [ ] **P08.01.01 Recruit consenting decision owners**
  Acceptance: Voluntary participants; withdrawal and data use explained.
  Evidence: Consent record. Prerequisites: P04.90.01.

- [ ] **P08.01.02 Collect baseline without retrospective invention**
  Acceptance: Physical measurements and effort logged with missingness.
  Evidence: Baseline dataset. Prerequisites: P08.01.01.

- [ ] **P08.01.03 Run comparison with predeclared measures**
  Acceptance: Comparable periods/arms; seasonality and attrition recorded.
  Evidence: Pilot protocol/results. Prerequisites: P08.01.02.

- [ ] **P08.01.04 Interview failures and non-users**
  Acceptance: Logistics, habit and input burden investigated.
  Evidence: Interview synthesis. Prerequisites: P08.01.03.

### P08.02 — Economics and pricing
Owner role: Product owner. Assign an actual owner before execution.

- [ ] **P08.02.01 Measure support and model cost per completed decision**
  Acceptance: Failed calls/retries/operator minutes included.
  Evidence: Cost worksheet. Prerequisites: P04.90.01.

- [ ] **P08.02.02 Test payer and willingness-to-pay hypothesis**
  Acceptance: Buyer and beneficiary distinguished; no invented commitments.
  Evidence: Pricing interview evidence. Prerequisites: P08.02.01.

- [ ] **P08.02.03 Calculate scenario unit economics**
  Acceptance: Compute/storage/support/verification/partner costs explicit.
  Evidence: Sensitivity model. Prerequisites: P08.02.02.

- [ ] **P08.02.04 Decide viable segment and expansion budget**
  Acceptance: Evidence supports target segment or stop/pivot.
  Evidence: Commercial decision. Prerequisites: P08.02.03.

### P08.03 — Operational trust
Owner role: Operations lead. Assign an actual owner before execution.

- [ ] **P08.03.01 Assign incident and data-rights owners**
  Acceptance: On-call routes, deletion exceptions and escalation time defined.
  Evidence: Operations runbook. Prerequisites: P04.90.01.

- [ ] **P08.03.02 Validate retention revocation and deletion**
  Acceptance: Derived records and media affected; audit legal hold scoped.
  Evidence: Data lifecycle evidence. Prerequisites: P08.03.01.

- [ ] **P08.03.03 Review fairness and accessibility**
  Acceptance: Low-connectivity/language constraints and exclusion harms assessed.
  Evidence: Accessibility/equity findings. Prerequisites: P08.03.02.

- [ ] **P08.03.04 Publish measured pilot limits**
  Acceptance: Claims preserve sample/time/geography and counterfactual uncertainty.
  Evidence: Pilot report. Prerequisites: P08.03.03.

### P08.90 — Phase exit review

- [ ] **P08.90.01 Review and accept permissioned pilot and operating model**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P08.01.04, P08.02.04, P08.03.04.

## P09 — Repair reuse and material exchange discovery
Horizon: Expansion. Entry dependency: P08.90.01. Exit: P09.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P09.01 — Asset lifecycle
Owner role: Product/domain lead. Assign an actual owner before execution.

- [ ] **P09.01.01 Choose a single repair or reuse category**
  Acceptance: Hazard, ownership and service capability fit recorded.
  Evidence: J-U01 scope decision. Prerequisites: P08.90.01.

- [ ] **P09.01.02 Model condition evidence and ownership rights**
  Acceptance: Photo is evidence, not authenticity/safety certification.
  Evidence: Asset contract. Prerequisites: P09.01.01.

- [ ] **P09.01.03 Draft repair-first options and human choice**
  Acceptance: AI summarizes issue; technician owns diagnosis.
  Evidence: Repair journey review. Prerequisites: P09.01.02.

- [ ] **P09.01.04 Capture completed repair or transfer outcome**
  Acceptance: Acceptance and actual service evidence required.
  Evidence: Outcome record. Prerequisites: P09.01.03.

### P09.02 — Service marketplace
Owner role: Partner lead. Assign an actual owner before execution.

- [ ] **P09.02.01 Verify repair and reuse partners**
  Acceptance: Geography, accepted items, credentials and liability agreed.
  Evidence: Partner records. Prerequisites: P08.90.01.

- [ ] **P09.02.02 Define availability matching and explicit fees**
  Acceptance: Availability consented; no unapproved purchase.
  Evidence: Matching/quote contract. Prerequisites: P09.02.01.

- [ ] **P09.02.03 Handle refusal dispute and return**
  Acceptance: Custody, ownership and responsibility transitions explicit.
  Evidence: Exception blueprint. Prerequisites: P09.02.02.

- [ ] **P09.02.04 Protect private location and contact data**
  Acceptance: Share minimum only after consent and match approval.
  Evidence: Sharing audit. Prerequisites: P09.02.03.

### P09.03 — Module validation
Owner role: Evaluation reviewer. Assign an actual owner before execution.

- [ ] **P09.03.01 Build category-specific rule and AI baselines**
  Acceptance: Same diagnosis evidence; no autonomous unsafe repair advice.
  Evidence: U evaluation protocol. Prerequisites: P08.90.01.

- [ ] **P09.03.02 Test identity fraud and prohibited material cases**
  Acceptance: Unsafe/hazardous/ownership-unclear listings blocked.
  Evidence: Negative cases. Prerequisites: P09.03.01.

- [ ] **P09.03.03 Pilot with one authorized partner**
  Acceptance: Repair success, time/cost and follow-through measured.
  Evidence: Pilot results. Prerequisites: P09.03.02.

- [ ] **P09.03.04 Gate broader materials exchange**
  Acceptance: Repeat demand and viable trust costs demonstrated.
  Evidence: Reuse expansion decision. Prerequisites: P09.03.03.

### P09.90 — Phase exit review

- [ ] **P09.90.01 Review and accept repair reuse and material exchange discovery**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P09.01.04, P09.02.04, P09.03.04.

## P10 — Energy and water modules discovery
Horizon: Expansion. Entry dependency: P08.90.01. Exit: P10.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P10.01 — Energy decisions
Owner role: Energy domain lead. Assign an actual owner before execution.

- [ ] **P10.01.01 Identify consenting site and actionable decision**
  Acceptance: Bill review or schedule advisory selected; no device control.
  Evidence: J-E01 scope. Prerequisites: P08.90.01.

- [ ] **P10.01.02 Verify meter bill and tariff data rights**
  Acceptance: Units, periods, calibration and legitimate access documented.
  Evidence: Energy data contract. Prerequisites: P10.01.01.

- [ ] **P10.01.03 Build deterministic normalized baseline**
  Acceptance: Weather/occupancy/period effects considered; uncertainty explicit.
  Evidence: Baseline method. Prerequisites: P10.01.02.

- [ ] **P10.01.04 Evaluate advisory with human authorization**
  Acceptance: Measured kWh and comfort/service constraints retained.
  Evidence: Energy validation results. Prerequisites: P10.01.03.

### P10.02 — Water decisions
Owner role: Water domain lead. Assign an actual owner before execution.

- [ ] **P10.02.01 Choose metered conservation or leak workflow**
  Acceptance: Site authority, response operator and measurement boundary set.
  Evidence: J-W01 scope. Prerequisites: P08.90.01.

- [ ] **P10.02.02 Validate volume time and sensor reliability**
  Acceptance: Missing/offline sensors shown; no invented meter readings.
  Evidence: Water data contract. Prerequisites: P10.02.01.

- [ ] **P10.02.03 Design human-reviewed anomaly workflow**
  Acceptance: AI explains reports; qualified person authorizes intervention.
  Evidence: Water journey walkthrough. Prerequisites: P10.02.02.

- [ ] **P10.02.04 Compare against thresholds and existing systems**
  Acceptance: Actual liters and effort evaluated against baseline.
  Evidence: Water comparative results. Prerequisites: P10.02.03.

### P10.03 — Cross-domain accounting
Owner role: Measurement lead. Assign an actual owner before execution.

- [ ] **P10.03.01 Separate resource units and causal claims**
  Acceptance: kg, kWh and liters never summed into invented eco-score.
  Evidence: Metrics contract. Prerequisites: P08.90.01.

- [ ] **P10.03.02 Review emissions factors and boundaries**
  Acceptance: Food/location/time/disposal factors only if justified and versioned.
  Evidence: Factor review. Prerequisites: P10.03.01.

- [ ] **P10.03.03 Measure platform compute and transport burden**
  Acceptance: Report available metrics and explicit unknowns; no net-zero claim.
  Evidence: Burden register. Prerequisites: P10.03.02.

- [ ] **P10.03.04 Authorize next domain only with evidence**
  Acceptance: Actor access, measurable effect and viable operations required.
  Evidence: Domain expansion gate. Prerequisites: P10.03.03.

### P10.90 — Phase exit review

- [ ] **P10.90.01 Review and accept energy and water modules discovery**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P10.01.04, P10.02.04, P10.03.04.

## P11 — Ecosystem scale and commercial reliability
Horizon: Scale. Entry dependency: P08.90.01. Exit: P11.90.01. Parent tasks are grouping labels; progress counts only the leaf units.

### P11.01 — Federation and interoperability
Owner role: Technical lead. Assign an actual owner before execution.

- [ ] **P11.01.01 Define interoperable partner capability registry**
  Acceptance: Permissions and availability separate from self-asserted badges.
  Evidence: Partner API contract. Prerequisites: P08.90.01.

- [ ] **P11.01.02 Version adapters and data sharing agreements**
  Acceptance: Schema compatibility, consent and revocation behaviors tested.
  Evidence: Adapter conformance report. Prerequisites: P11.01.01.

- [ ] **P11.01.03 Add durable notifications and reconciliation**
  Acceptance: Outbox, dedupe, retries and delivery status explicit.
  Evidence: Delivery/replay evidence. Prerequisites: P11.01.02.

- [ ] **P11.01.04 Verify federation without tenant leakage**
  Acceptance: Per-offer grants, scoped projections and revocation tested.
  Evidence: Cross-organization security report. Prerequisites: P11.01.03.

### P11.02 — Reliability and security
Owner role: Platform/security lead. Assign an actual owner before execution.

- [ ] **P11.02.01 Measure load then set SLOs and capacity**
  Acceptance: P95/availability/error budgets grounded in pilot load.
  Evidence: Capacity/SLO report. Prerequisites: P08.90.01.

- [ ] **P11.02.02 Exercise backups restore and disaster recovery**
  Acceptance: Recovery points/times measured with owned runbooks.
  Evidence: Restore drill. Prerequisites: P11.02.01.

- [ ] **P11.02.03 Perform abuse and data protection review**
  Acceptance: Rate limits, malicious uploads, privilege abuse and retention audited.
  Evidence: Security findings disposition. Prerequisites: P11.02.02.

- [ ] **P11.02.04 Reconcile spend with outcomes and incidents**
  Acceptance: Per-tenant cost limits and operational owners established.
  Evidence: Operations dashboard evidence. Prerequisites: P11.02.03.

### P11.03 — Business rollout
Owner role: Product/operations lead. Assign an actual owner before execution.

- [ ] **P11.03.01 Validate network density in one geography**
  Acceptance: Match availability, acceptance and completion measured.
  Evidence: Network cohort analysis. Prerequisites: P08.90.01.

- [ ] **P11.03.02 Pilot contracts pricing and support SLA**
  Acceptance: Operator incentives and liability terms approved.
  Evidence: Commercial pilot agreement. Prerequisites: P11.03.01.

- [ ] **P11.03.03 Gate incentives against fraud and coercion**
  Acceptance: No reward for generated surplus or fabricated impact.
  Evidence: Incentive abuse review. Prerequisites: P11.03.02.

- [ ] **P11.03.04 Approve phased expansion or stop**
  Acceptance: Retention, trust, measured outcomes and margin support decision.
  Evidence: Scale investment decision. Prerequisites: P11.03.03.

### P11.90 — Phase exit review

- [ ] **P11.90.01 Review and accept ecosystem scale and commercial reliability**
  Acceptance: All prerequisites verified; critical risks closed or explicitly rejected for rollout; human records go/revise/stop decision.
  Evidence: Phase gate record with reviewer, evidence links, residual risks and next scope. Prerequisites: P11.01.04, P11.02.04, P11.03.04.

## Change control
Keep IDs immutable. Append new leaf rows in dependency order and add their evidence conditions; do not renumber completed work. A new dependency that appears later in the sheet must be deliberately reordered or split through a reviewed change, and a cycle is invalid. Update the affected gate and narrative scope. Cancelled or deferred work remains visible; it is excluded from an authorized release by an explicit scope decision, not checked complete.

The JSON companion preserves the initial structured plan. It is an export/snapshot, not a second live task system. The live tracker should be exported before major edits and at phase handoffs. Automatic two-way synchronization and CI updates require a later implementation task and are not supplied by this document-only work.

