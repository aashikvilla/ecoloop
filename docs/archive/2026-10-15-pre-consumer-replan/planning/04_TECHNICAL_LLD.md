# EcoLoop technical design — low level
Version 0.1 · 15 October 2026 · Proposed contracts for review; no endpoints in this document are claimed implemented.

## 1. Contract ownership and compatibility
Keep frontend/ and backend/. FastAPI owns domain validation and canonical writes; the browser and ADK call these services through the same permission boundary. Publish reviewed OpenAPI as the wire contract and generate TypeScript types during implementation. Breaking changes require a new API version or a migration with recorded compatibility. Internal Python classes and prompts are not public contracts.

Proposed public prefix: /v1. Proposed unversioned health path: GET /health. The current starter uses /api/v1; migration must explicitly decide whether a temporary alias is needed, update every client, and verify deployed probes. Do not silently maintain two independently evolving implementations.

REQ-AUTH-01: verified actor plus active organization membership plus resource permission.
REQ-FACT-01: extraction produces candidates; confirmation is an explicit, versioned transaction.
REQ-ACT-01: approval binds an immutable preview and never enlarges authority.
REQ-POL-01: reviewed, applicable policy governs deterministic checks; unknown applicability blocks the relevant action.
REQ-IMPACT-01: measurement and attribution remain explicit; a generated suggestion is not an observed saving.

## 2. Common record envelope
Every tenant-owned canonical record has id (opaque server-generated string), tenant_id, schema_version, record_version (monotonically increasing integer), created_at and updated_at (server UTC instants), created_by, provenance_refs, and lifecycle status. Store the relevant IANA zone separately for meal schedules; never use a browser's timezone to infer a cooking deadline. Resource identifiers are not authorization.

Use quantity as a decimal string plus a controlled unit code and dimension. Canonical food mass may use integer grams when the validated range and required precision permit. Money uses integer minor units plus currency. Do not mix currencies, pieces, liters and grams; density or per-piece conversion needs an explicit confirmed factor and provenance. All numeric boundaries reject NaN, infinity, negative amounts where invalid, excessive precision and overflow. Zero diners is valid and yields a no-cooking option, not division by zero.

Evidence records include media/object version or source text reference, observed_at, received_at, actor, purpose consent reference, content hash, MIME type, size, retention policy, access state and deletion/dispute state. Evidence identity establishes lineage, not authenticity or safety.

Candidates include parse_run_id, source_evidence_id, proposed fields, source spans, missing fields, uncertainty reasons and extraction model/config version. A confidence number alone cannot waive review. Confirmed facts include confirmed_by, confirmed_at, previous_version and correction reason.

## 3. Domain records and invariants
Membership: organization, actor, active/revoked state, roles, allowed scopes and consent/version. Server membership is authoritative for current access; any selected tenant and token tenant claim must be consistent with the authenticated context. No missing-tenant fallback.

InventoryBatch: food identity, owner/sharing scope, original confirmed quantity, remaining quantity, unit, received/opened dates if known, last_verified_at, status and evidence. Deduction uses a movement record with reason (received, consumed, discarded, corrected, transferred); do not overwrite an ambiguous balance with a guessed quantity.

MealPlan: scheduled_at, zone, confirmed diners, ingredient/recipe version, preparation state, last_reversible_at, cutoff authority, and change-event references. An attendance reporter may propose a change; the cook/chef owns actual preparation. Expired stock verification prompts correction.

Decision: source record/version pairs, applicable policy version, evaluated_at, deterministic rule results, uncertainties, one or two alternatives, and trace reference. Persist the structured calculation separately from the model explanation.

ActionProposal: tenant, action type, recipient/resource IDs, immutable normalized payload, payload hash, source versions, required approval scope, policy version, expiry, simulated flag, preview version and status. Demo adapters reject simulated=false irrespective of model output.

Execution: proposal ID, actor authorization reference, idempotency key hash, payload hash, state, attempt count, provider request ID where applicable, reconciliation state, timestamps and audit refs. Do not store secret provider credentials in these records.

FoodOffer: donor-owned batch, unused/unserved declaration, packaging/label details where applicable, qualified eligibility review, policy version, handling evidence, expiry, capacity reservation, NGO and recipient acceptances, transport conditions and custody references. Partner verification and batch eligibility are separate records.

Outcome: metric type, quantity/unit, stage, period, evidence/method, measurement origin (instrument/manual/self-report/estimate/simulation/unknown), verification status, uncertainty, and attribution status. A weighing can be real yet independently unverified. Unknown has no invented numeric value.

OrganicLoad: source, accepted-material policy, gross/tare/net weights, collected/accepted/rejected/processed events, process-batch allocation and dispute state. Moisture, additions and process losses need explicit balance terms. ReuseAsset, MeterObservation and ServiceVisit later extend the shared evidence/action envelope using domain-specific schemas.

## 4. Storage and access layout
Proposed collections: tenants/{tenant}/memberships, evidence, candidates, inventory_batches, inventory_movements, meal_plans, decisions, proposals, executions, outcomes, audit_events, jobs and outbox. Kitchen, recovery and organics add bounded collections rather than one untyped resource blob.

Server SDK access requires explicit backend checks because Firestore server libraries bypass client Security Rules. Initially deny direct browser access to canonical collections. If later read-only projections are introduced, keep them minimal and independently test their rules.

Cross-organization cooperation uses a ShareGrant with owner tenant, counterparty tenant, resource ID, allowed fields/actions, purpose, expiry, consent version and revocation state. Materialize an approved offer projection. Do not grant the counterparty access to donor inventory or household membership. Recipient capacity is accepted through its own authorized operation; it is not edited by the donor.

Queries always start from an authorized tenant scope and include bounded pagination. Cursor tokens bind to tenant/filter/order and expire. Use composite indexes for expected tenant/status/time reads. Do not fetch global records then filter in memory. Partition hot counters; record index and contention decisions when measured.

## 5. API catalogue and HTTP semantics
GET /health returns service/version/readiness without secrets or a blocking model/database call. GET /v1/demo/scenarios returns synthetic fixture metadata, with conspicuous demo identifiers and no private user state.

POST /v1/evidence/uploads requests a short-lived, restricted upload target after MIME/size/purpose checks. Finalization verifies actual object metadata and scan status; untrusted content cannot be rendered as executable HTML.
POST /v1/intake/parse creates candidate extraction. Return 200 with candidate records for a bounded synchronous result, or 202 with operation_id and polling URL. Never confirm facts as a side effect.
POST /v1/facts/confirm accepts candidate_id, corrected field values, expected record versions and confirmation intent. Return the committed fact versions and audit ID.
POST /v1/meal-plans/change accepts authorized participation changes plus expected plan version. Cooking authority and policy still govern subsequent decisions.
POST /v1/decisions/evaluate accepts scoped resource IDs and expected versions; returns traceable alternatives and unresolved assumptions.
POST /v1/actions/preview creates the immutable draft. POST /v1/actions/{id}/approve requires preview_hash, expected proposal version and Idempotency-Key.
GET /v1/operations/{id} returns authorized operation state and last update; cancellation requests have explicit allowed states.
POST /v1/kitchens/batches, /v1/recovery/offers and scoped accept/reject/custody operations are later domain APIs with distinct permissions.
POST /v1/outcomes/measured records a physical observation with method/evidence. GET /v1/evaluation/results returns run IDs, corpus/version, denominators and actual outputs.
DELETE /v1/users/me/context starts a scoped deletion request. Return 202 and a lifecycle receipt when retention or asynchronous cleanup is involved.

Use 401 for missing/invalid identity, 403 for known disallowed operation, and a consistent non-enumerating 404 policy for inaccessible resources. Use 409 for stale version, invalid transition or idempotency payload conflict; 410 for an expired resource when disclosure is authorized; 422 for invalid fields/units; 429 with retry guidance for limits; 503 for unavailable dependencies. Error envelope: code, safe message, field issues, request_id, retryable, and optional current_version. Do not include other tenants' metadata or raw model prompts.

Example approval body, illustrative only:
proposal_id = prop_demo_001
preview_hash = sha256:<normalized-preview-digest>
expected_version = 3
confirmed_intent = approve_simulated_action
The server derives tenant and actor from authenticated context; they are never trusted from this body.

## 6. Confirmation transaction
Authenticate and resolve current membership. Read candidate, evidence state, current target fact version and consent in one permitted transaction. Verify candidate belongs to the selected tenant, source remains usable, expected versions match, fields are valid and the actor can confirm them. Write canonical fact/movement, new version, confirmation audit event and any required outbox record atomically.

Transaction retries must not invoke Gemini, send notifications or call providers. A conflict returns 409 with safe current-version information; the UI preserves human edits and asks the user to reconcile. A repeated confirmation intent with the same idempotency binding returns the original committed result. A corrected candidate remains historically traceable.

## 7. Proposal and execution state machines
Proposed proposal states: DRAFT -> AWAITING_APPROVAL -> APPROVED -> EXECUTING -> SUCCEEDED or FAILED. EXPIRED, REJECTED, CANCELLED and SUPERSEDED are explicit terminal or intervention states. RECONCILIATION_REQUIRED means an external effect is ambiguous; it is not permission to repeat it.

On approval, recheck current membership, approval scope, active consent, expiry using server time, preview hash, source versions, capacity reservation, recipient acceptance, policy applicability and simulation mode. Within a transaction, record the approval, allocate one execution identity and claim its idempotency key. Same key and same payload returns the existing execution; same key with changed payload yields 409. Enforce one effective execution per approved proposal independently of key reuse.

The worker rechecks material conditions immediately before dispatch. An outbox record and action transition are atomic; queue publication is retried by a reconciler. Leases bound worker ownership; attempts increment atomically. Network effects happen outside the transaction. Provider-side idempotency and status lookup are prerequisites for future live actions. Timeouts after submission require status reconciliation; never claim exactly-once physical delivery.

Cancellation after custody or execution may require compensation or an operator incident. A late revocation can block future access but cannot physically reverse a completed transfer. Preserve the timeline and accountable human.

## 8. Extraction and orchestrator boundaries
Parse inputs are untrusted data even when a receipt says to ignore instructions or purchase an item. Keep system policy separate from source material, use schema-constrained output, validate returned fields and allowlisted values, and ask for correction on missing or conflicting evidence. Do not rely on prompt wording as the security boundary.

A minimal registry might expose read_confirmed_context, calculate_portions, evaluate_cutoff, assess_evidence_completeness and draft_simulated_action. Each tool receives scoped identifiers and server-bound actor context, validates permissions and returns typed results. Do not pass arbitrary URLs, SQL, Python code, unrestricted file paths, bearer tokens or a general network tool to the product agent.

Configure model ID, region, input size, output token cap, turn limit, timeout and retry policy. Stop when facts or authority are missing. Record redacted model/config versions, tool names, validation failures, actual tokens and latency. Memory may summarize opted-in preferences; canonical stock and current capacity are reread.

## 9. Food policy and physical measurement
A policy bundle contains jurisdiction, source URL/section, effective dates, reviewed applicability, food/service categories, parameter units, reviewer and change history. Deterministic checks return PASS, FAIL or REVIEW_REQUIRED with rule IDs and evidence references. PASS means a particular configured check passed; it never means the model certified food safety.

Existing local shortcuts such as one universal cooking cutoff or a blanket temperature/time quartet are unverified policy assumptions. They must not enter production rules without source-specific qualified review. The [2019 FSSAI regulation](https://www.fssai.gov.in/upload/uploadfiles/files/Gazette_Notification_Surplus_Food_06_08_2019.pdf) includes donor/distributor obligations, handling and records; its applicability must be reviewed with any later amendments or guidance before a live pilot.

For organics, state the measured system boundary and time period. A useful balance is opening stock + inputs + additions = closing stock + outputs + rejects + documented losses + unresolved difference. Do not force wet input to equal dry output. For household waste, a changed cooking recommendation alone does not establish prevented waste. Record actual measured outcomes and counterfactual limits separately.

## 10. UX, failure and operations contracts
The scenario screen is explicitly synthetic. Candidate review keeps original evidence visible and allows correction. Approval shows exact action, recipient, quantities, simulation state, expiry, fees if relevant, and uncertainties. Outcome capture supports unknown, partial and disputed states. Focus moves to validation errors; status changes are accessible; touch targets and 360px layout require browser verification.

Every long operation has an ID and resumable status. The initial version uses bounded polling with backoff and a visible updated timestamp. Do not cache private approvals or allow offline dispatch. A reconnect refetches authorized resource versions before enabling controls. Notifications are informational; a delivered notification is not recipient acceptance.

Logs include request/trace IDs, operation, tenant-safe identifier, duration, outcome code and redacted model usage. Exclude raw tokens, sensitive schedules and full receipts. Define retention, access and deletion jobs for evidence, projections and model artifacts. Preserve a minimal lawful audit trail only under a recorded retention basis.

## 11. Verification contracts before release
Auth tests cover wrong tenant, revoked member, omitted claims, role escalation, guessed IDs and worker service identity. Fact tests cover extraction isolation, correction, duplicate confirmation and version conflict. Action tests cover changed preview, expired offer, concurrent approval, stale capacity, ambiguous provider timeout and revocation. Domain tests cover zero diners, unit mismatch, partially consumed stock, after-cutoff requests, served/spoiled food, missing handling evidence, dietary mismatch, full recipient and partial rejection.

The end-to-end demonstration must capture evidence -> candidates -> correction -> confirmation -> decision -> immutable preview -> authorized simulated approval -> outcome status. Preserve run ID, fixture version, expected/actual states and screenshots. A passing static schema or unit suite cannot replace this journey. Tests and model calls described here are future work; no implementation pass is claimed.

## 12. Technical source pointers
- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions): retry-aware transactional writes.
- [Firestore server authorization](https://firebase.google.com/docs/firestore/security/rules-conditions): server IAM versus client rules.
- [Cloud Tasks delivery considerations](https://docs.cloud.google.com/tasks/docs/common-pitfalls): idempotent consumers.
- [Firebase ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens): authenticate before organization authorization.
- [Structured output](https://ai.google.dev/gemini-api/docs/structured-output): typed output does not establish factual correctness.
- [Existing API handoff](https://docs.google.com/document/d/1i0TU3ILttOPLd4rEjCEUJL7HBK0cADV2QBuC_jUAD68/edit): historical input, with layout/prefix differences resolved through decisions.

## 13. Illustrative wire examples
These are synthetic contract examples for review. They are not sample production records or implemented endpoints.

Candidate parse request:
{
  "evidence_id": "ev_demo_receipt_001",
  "intent": "inventory_observation",
  "locale": "en-IN"
}
Candidate response:
{
  "candidate_id": "cand_demo_001",
  "state": "CANDIDATE",
  "fields": {"name": "rice", "quantity": "500", "unit": "g"},
  "source_evidence_id": "ev_demo_receipt_001",
  "missing_fields": ["physically_received_confirmation"],
  "committed": false
}

Fact confirmation request:
{
  "candidate_id": "cand_demo_001",
  "confirmation_intent_id": "confirm_demo_001",
  "expected_versions": {"inventory_batch_demo_001": 2},
  "corrections": {"quantity": "450", "unit": "g"},
  "confirmed_observed_at": "2026-10-15T12:00:00Z"
}
The server binds actor, tenant and confirmation time, validates source ownership and writes a new fact version. A source observation timestamp supplied by the user remains explicitly user-supplied.

Decision request:
{
  "meal_plan_id": "meal_demo_001",
  "expected_plan_version": 4,
  "inventory_refs": [{"id": "inventory_batch_demo_001", "version": 3}],
  "requested_diners": 2
}
The response records original and target servings, exact deterministic ingredient requirements, available confirmed stock, assumptions, rule IDs and proposal references. It does not infer that a physical reduction already happened.

Preview response:
{
  "proposal_id": "prop_demo_001",
  "version": 1,
  "status": "AWAITING_APPROVAL",
  "action_type": "MOCK_CART_TOPUP",
  "simulated": true,
  "source_versions": {"meal_demo_001": 4, "inventory_batch_demo_001": 3},
  "preview_hash": "sha256:illustrative-digest",
  "expires_at": "2026-10-15T12:15:00Z",
  "uncertainties": []
}
The actual expiration is configured from the action and policy context; these timestamps are only examples.

Conflict response:
{
  "error": {
    "code": "STALE_SOURCE_VERSION",
    "message": "The meal plan changed. Review a new preview.",
    "request_id": "req_demo_001",
    "retryable": false,
    "current_version": 5
  }
}
The UI preserves edits, fetches the authorized new state and asks for review. Retrying the same approval without a new preview is invalid.


