# Simplified organization pickup plan — 18 October 2026

## Owner request

Produce a detailed implementation plan on a new feature branch. The owner removed manual approval, coordinator/collector roles and collector assignment, prioritizing multi-offer grouping, routes, one-operator collection and receipt, and donor/recipient impact visibility. AI is optional if its integration delays a useful flow.

## Result

Created branch `feature/organization-pickup` from the current clean `main`. Added [the detailed plan](../../planning/ORGANIZATION_PICKUP_IMPLEMENTATION_PLAN.md) with O2-00–O2-13 tasks, dependencies, paths, three worker lanes plus integrator, revised profile eligibility, coarse discovery/exact claimed routing, receipt ledger rules and future acceptance criteria. Added scope pointers in the household spec, previous Phase 2 contract, implementation plan, parallel execution, architecture and decision knowledge so the older manual-approval/role requirements cannot silently reappear.

Two read-only planning subagents reviewed backend/access/ledger boundaries and frontend/group/route/ownership boundaries. Findings incorporated: approval policy exists at multiple enforcement points; current discovery is global latest-50 OPEN-only; exact route geometry is private; existing deterministic claims prevent re-reservation; donor cancellation/history needs claim reconciliation; existing Places autocomplete is not a Routes integration.

Final review also fixed atomic plan-stop/claim linkage, one collection per claim, saved destination stability after profile edits, zero-collection status and offer-status recomputation, donor-specific handover authority, and the first-version rule that collection is recorded before the deadline while receipt may follow later.

## Evidence and limits

Inspected repository routes, schemas, domain code, organization placeholder and Places loader. Checked official Google Routes waypoint-order/reference and Maps URL documentation for the planned provider boundary. No application checks, builds, unit tests, provider calls, cloud changes, live task edits, commits, pushes or deployment were performed. Documentation review is not implementation acceptance.

Documentation verification: `git diff --check` passed; every relative file link in the detailed plan resolves. Working-tree changes are limited to documentation on `feature/organization-pickup`. Planning reviewers: Codex `recipient_flow_plan` and `recipient_route_ux_plan`, 18 October 2026; their material follow-up corrections were incorporated.

Next execution checkpoint is O2-00 contract freeze followed by the plan's parallel lanes. The live MVPTasks Sheet remains the task-status authority; O2 tasks are proposed units until authorized tracker entry. Current [architecture](../ARCHITECTURE.md), [decision](../DECISIONS.md#simplified-recipient-pickup-scope--2026-10-18), [dated status](../../STATUS.md) and [Phase 0/1 evidence](../../implementation/social-impact-phase1.md) retain their separate implementation meanings. No new past-mistake incident was discovered; the existing source-precedence prevention pattern applies.
