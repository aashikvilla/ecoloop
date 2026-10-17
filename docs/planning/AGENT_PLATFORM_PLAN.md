# Agent Platform integration plan — 17 October 2026

## Target shape

Keep the existing ADK household orchestrator and FastAPI authority boundary. Coding agents are development workers; they are not product agents. Use one ADK orchestrator with modular, read-only scoped tools and fixed response cards. FastAPI continues to authenticate Firebase identity, check active household membership, validate proposals, and write canonical facts only after explicit approval.

```text
Next.js ──Firebase ID token──> FastAPI / Cloud Run
                                  ├── Firebase Auth + Firestore (identity, membership, canonical facts)
                                  └── ADK household orchestrator
                                       ├── Agent Engine Runtime (managed execution)
                                       ├── Agent Engine Sessions (temporary conversation state)
                                       └── Agent Engine Memory Bank (approved preferences only)
```

Firestore remains the source of truth. Managed Sessions are conversation state, not the canonical data store. Memory Bank is a derived, owner-private index of explicit consented preferences; it must never ingest raw transcripts or confirmed household inventory.

## Local code sequence

1. Preserve the existing orchestrator, scope checks, typed card validation, and local in-memory fallback.
2. Add a configuration-selected managed Sessions adapter. It is enabled only when the Agent Engine resource ID, project, and location are all explicitly set; partial configuration fails closed.
3. Add a separate Memory Bank adapter behind an opt-in switch. A preference write is eligible only after explicit owner consent and successful canonical Firestore persistence. Store provider resource IDs/status alongside the private preference so correction, revoke and delete can be reconciled. Provider failure must remain visible and must not pretend deletion succeeded.
4. Add privacy-safe health/status reporting for configured capability versus verified live capability. Do not probe paid APIs from health checks.
5. Use Agents CLI for workspace skills and reviewable local ADK lifecycle/evaluation preparation. Do not run scaffold enhancement over EcoLoop's custom FastAPI layout unless its diff is isolated and reviewed.
6. Prepare synthetic evaluation cases and CLI instructions. Do not call Gemini or execute evaluations until a per-run limit is chosen and observed.

### Local implementation checkpoint — 17 October 2026

Agents CLI `v1.10.0` and its official ADK workspace skills are installed. The repo-specific specification preserves one ADK orchestrator and the consent boundary; no scaffold was applied over the custom FastAPI app. The backend now includes the locked Agent Platform SDK, default-off configured managed-session support with bounded idle TTL, and a separate default-off Memory Bank adapter. Memory writes are tied to canonical consented Firestore preference versions; reads are static-query candidates rechecked against Firestore, and failed cleanup remains a visible tombstone with an explicit retry path. Health exposes configuration without making a provider request. Frontend preference controls reflect sync/unavailable states.

This is local code only: no resource was provisioned and no managed API/model request was made. M0.02.01/02/03 and M3.01.01/02/03 remain open until cost controls and service access are evidenced, then managed two-session/isolation/consent/deletion acceptance and reviewer exit criteria pass. See the [dated implementation record](../knowledge/sessions/2026-10-17-agent-platform-local-implementation.md).

## Cloud activation gates

Billing is currently enabled for `ecoloop-staging-20261015` and linked to the open “Hackathon billing Account”; CLI reported EcoLoop as its only linked project. The observed monthly budget is ₹2,000, filtered to Gemini API only, with 50/80/100% alerts and a configured Gemini API spend cap. Billing console showed ₹0 reported for 1–17 October, subject to reporting delay. These observations do not cap or measure Agent Engine, Cloud Run, Firestore, Storage, Artifact Registry, or builds. Available credits remain unverified.

The existing implementation plan requires a $10/month project alert and explicit additional cost controls before paid services. The owner has now requested a total-project monthly ceiling as well. The observed ₹2,000 Gemini-only budget is not yet a project-wide ceiling, and Cloud Billing budgets are alerts rather than a guaranteed hard stop. Before provisioning, record the owner-approved amount, configure and verify an all-services project budget and alert recipients, and determine which service-specific controls can actually stop spend. Do not treat a Gemini API-only spend cap or a project budget alert as a hard project cap. Verified credits, chosen region, IAM principals/roles, required APIs, secrets references and rollback/delete steps also remain prerequisites.

Cloud deployment has not been performed by this plan. Enable APIs, create Agent Engine resources, deploy or call managed services only after the cost/identity/region gates are recorded and the user confirms any remaining spend boundary. No account activation or billing changes are included here.

## Acceptance order

1. Local/static review confirms default local fallback, strict partial-config failure, verified identity/household scope, bounded IDs, no transcript-to-memory path, and accurate unavailable state.
2. Cloud readiness review records project, region, quota, IAM, budget/cost controls and resource ownership.
3. Provision one managed Agent Engine runtime with Sessions and Memory Bank only after the cost gate; capture resource IDs in local ignored configuration or Secret Manager, never Git.
4. Authenticated acceptance proves a model tool trace, owned managed session persistence, cross-user/session denial, consented preference recall across two sessions, edit/revoke/delete propagation, and no private transcript leakage.
5. Review evaluation traces and cost, then deploy the FastAPI service and frontend only through the approved single-project rollout/rollback path.

Local adapters or successful health/HTTP checks do not close the cloud acceptance tasks in `docs/planning/IMPLEMENTATION_PLAN.md` or live MVPTasks.
