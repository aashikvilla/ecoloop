# EcoLoop execution harness and software factory operating guide
Version 0.1 · 15 October 2026 · Documentation and native collaborative tracker; application automation is proposed.

## 1. What works immediately
The native Google Sheet is the live record for task status. Multiple authorized collaborators can edit owners, status, checkboxes, evidence, reviewers and timestamps. Formulas recalculate unit verification and phase rollups when those fields change. Google Docs hold the product narrative, journeys, design, decisions and feasibility. The control-room index links the set. Local Markdown/JSON are dated source snapshots for repository review and recovery.

This creates a usable manual operating harness without application code. It does not monitor the repository, execute tests, infer task completion, sync Git and Drive, create issues or run agents on a schedule. Those integrations require separately authorized implementation. Real-time collaboration means native Sheet/Doc edits and calculation, not an unbuilt background synchronization service.

## 2. One authority per type of state
Live unit status: Tasks sheet, stable ID. Live decision disposition: Decisions sheet, stable decision ID. Narrative contract: linked Google Doc and explicit version. Research provenance: inventory/source register. Evidence: linked immutable run, revision, screenshot or approved record. Session handoff: Sessions sheet plus a dated local journal snapshot when used. Do not copy private partner records into a public repository.

A Drive document edit can change the design but does not change implementation completion automatically. A code commit can change behavior but does not check a task automatically. The owner links evidence and the reviewer verifies that it satisfies the exact acceptance condition. This separation is the control mechanism.

## 3. Task fields and state meanings
Task ID, phase and parent workstream identify the unit. Action states the output. Owner is an actual person or assigned agent during execution; the initial role label is a staffing placeholder. Status uses Not started, In progress, Blocked, In review or Complete. Done is a human completion checkbox. Three prerequisite columns bind stable earlier IDs. Acceptance and evidence expectation describe what must be shown. Evidence, reviewer and updated date are editable completion inputs. Context budget is a reading allowance; effort hours remains blank until estimated. Requirement/journey references connect scope to acceptance.

Verified requires checked Done, Complete status, evidence, reviewer, update date, and verified dependencies. A duplicate ID, missing/later dependency, unchecked prerequisite or incomplete evidence prevents verification. A checkbox alone never proves code behavior. Formulas cannot judge whether a URL is truthful or whether a reviewer is qualified; accountable review supplies that judgment.

Use filter views to focus on a phase or owner. Preserve the dependency order of Tasks rows; dependency formulas deliberately look only at preceding rows to prevent circular evaluation. Do not sort the physical task grid. A missing or later prerequisite fails closed. Appended tasks may depend on earlier IDs. If a new dependency requires insertion/reordering, export a backup and have the tracker maintainer update/reverify formulas and gates. This is a documented limitation of the initial spreadsheet harness.

## 4. Daily operating loop
1. Read the control room, active decision and latest session handoff.
2. Choose one authorized Ready/Open unit whose dependencies are verified.
3. Assign owner/reviewer, estimate, relevant contract version and context allowance.
4. Produce a task packet with inputs, exact output, acceptance, risks and allowed actions.
5. Change status to In progress and record actual start/update time. Keep one active unit per agent.
6. Implement only after human authorization for that scope. For this session, outputs are documentation.
7. Verify the task with the smallest meaningful checks plus its required end-to-end behavior.
8. Attach exact evidence, move to In review, and record unresolved failures.
9. Reviewer records acceptance or reopens the unit. Set Complete and Done only with evidence.
10. Update decisions, risks and session handoff before leaving or handing off.

A blocked task records the missing external fact, responsible owner and next unblock action. Do not mark it complete to make the phase look better. A stopped/deferred capability needs a scope decision; it remains historically visible.

## 5. Phase gate record
Each phase has a dedicated .90.01 unit that depends on its three parent workstream endpoints. Its record includes intended result, actual evidence, critical failures, residual uncertainty, cost/time/usage, operational owner, rollback/recovery and the continue/revise/stop decision. Verify end-to-end integration across the seams instead of accepting three independent component claims.

Required invariants cannot be waived as routine risk acceptance. Disable the unsafe capability or stop the release. A demo can keep partner actions simulated; a live pilot needs actual data rights, qualified review and operator authorization. Product progress, safety readiness and commercial evidence are separate judgments.

## 6. Role cards for a small software factory
Product owner: chooses actor, job, scope and investment; accepts business tradeoffs. Deliverable is a scope/priority decision with falsification condition.
Technical lead/orchestrator: decomposes authorized work, owns contracts and integration, rejects duplicate policy implementations, and maintains the handoff.
Domain/policy reviewer: determines applicability and qualified operational requirements; validates rule sources without delegating safety certification to AI.
Backend owner: implements auth, versions, transactions, deterministic rules, proposals and audit.
Frontend owner: implements the reviewed journey and all loading/empty/error/partial/success states with accessible controls.
AI owner: owns candidate schema, prompt/tool boundaries, caps, redaction and comparative extraction/orchestration evidence.
Evaluation reviewer: checks expected labels, permission attacks, stale state and complete journeys; reports failures with denominators.
Platform/operator owner: owns deployment access, IAM, budget, rollback, incidents, partner availability and physical exceptions.
Research steward: maintains source dates, scope, contradictions, unknowns and non-independent duplicates.

These are responsibilities, not a requirement to hire nine people or run nine simultaneous agents. Assign independent work only when contracts and write ownership are clear. Parallel review can help; parallel edits to the same files or conflicting task status create rework.

## 7. Reusable work packet
Unit ID and authorized scope:
Related decision, requirement, journey and contract version:
Observed problem and current behavior:
Inputs and source rights:
Files/artifacts that may change:
Expected output and explicit acceptance:
Dependencies and known risks:
Allowed tools/side effects:
Verification commands or manual rehearsal:
Evidence location and reviewer:
Context allowance and stop/checkpoint threshold:
Actual result, surprises and next handoff:

Attach only the relevant excerpts. Do not paste all 42 research files into every packet. A blocked account, ambiguous policy or unauthorized physical effect is a reason to stop dependent work and resolve that fact.

## 8. Context and token discipline
Progressive disclosure is the default: control room first; active unit second; one relevant contract/journey; then only needed code/source evidence. A typical small unit may use roughly 4,000–8,000 input-context tokens; the tracker defaults to 6,000. This is a proposed working allowance, not an account quota or total inference estimate. Output, tool reads, repeated retries and delegated contexts also consume resources.

Checkpoint after a meaningful unit or when the context contains too much unrelated history. A handoff should fit roughly 500–1,000 words: objective, authorized scope, changed artifacts, current versions, failing output, evidence, decisions, blocker and exact next action. Preserve actual outputs; do not summarize a failed command as passed. Record actual token/cost figures only when supplied by runtime/model telemetry.

Before spawning parallel work, ask whether the independence benefit exceeds duplicate context and coordination cost. Keep stable contracts in files and use concise source IDs. Load the research inventory and specific source only as needed. If the remaining allowance is low, finish a coherent reviewable unit and preserve the rest as unchecked work. Budget pressure never justifies inventing verification.

## 9. Instructions and skills governance
Existing skills are procedural aids, not proof of implementation quality or legal truth. The current local corpus has shortcuts requiring audit: default tenant examples, API prefix drift, universal cooking/food thresholds, unsupported model-accuracy claims and overbroad carbon factors. A copied snippet must pass the product's actual trust boundary.

Start by exercising this documented workflow. Add a skill only when a repeated multi-step procedure has a clear trigger, inputs, outputs, boundaries and verification. Add deterministic hooks/CI validators only when authorized and when they enforce a known check. Avoid installing a collection of overlapping agents and rules merely to resemble a software factory. Keep root guidance concise; use linked role/runbook detail.

Potential later automation backlog: schema validation of task IDs/DAG, evidence link checks, CI-to-task run IDs, reviewed release gate summaries, conflict-aware Drive/repo snapshots and append-only session capture. None should silently approve a physical action or overwrite a human's live edit.

## 10. Recovery, updates and handover
Before structural tracker edits, export a versioned snapshot. Restore from version history or the last snapshot when formulas or task order are damaged. Revalidate unique IDs, all dependencies, gate formulas and representative phase rollups. Do not regenerate over live work without comparing the current revision.

When a requirement changes, identify affected tasks, invalidate stale evidence, open a decision record and update contract versions. Keep old proof as history, not current acceptance. When a person revokes consent or a partner exits, follow domain lifecycle rules; the planning tracker must not retain unnecessary private data.

At session end, record the task IDs touched, output URLs/revisions, current result, unresolved failures, key decisions and next unit. Add a Past Mistake only for a transferable lesson, with the class of failure and preventive check. Record architectural choices as proposed or approved with the actual authority. The next session should be able to resume without rereading the full chat.

