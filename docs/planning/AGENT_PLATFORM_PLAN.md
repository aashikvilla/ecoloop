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

The owner reports billing is enabled for `ecoloop-staging-20261015`. An earlier console observation recorded the open “Hackathon billing Account” and a ₹2,000 monthly Gemini-only budget with 50/80/100% alerts and a Gemini API spend cap. This run created a separate ₹2,000 monthly **alerts-only** budget named “EcoLoop all-services monthly budget alert,” scoped to all 1,778 services and the billing account's only project, with actual-spend email alerts at 50/80/100%. The budget console reported ₹0.00 / ₹2,000.00 at creation; usage reporting may be delayed. This is a signal for the current single-project account scope, not a guaranteed total-project hard stop. The existing Gemini-only spend cap remains. The read-only CLI billing query failed because Cloud Billing API is disabled in quota project `681255809395` and the active identity cannot query target details; linked-project inventory, balances, credits and other cost controls remain unverified.

The owner approved ₹2,000 as the all-services monthly alert amount. Google Cloud disables “Spend cap enforcement” for all-services budgets; the created alert cannot pause all billable services. Per-service caps may be available for selected services, but do not cover every product. Do not represent the configured alert plus the existing Gemini cap as a guaranteed total-project hard cap. Before paid managed-service provisioning or deployment, verify linked-project inventory and credits, choose the region, review IAM principals/roles and required APIs, set any eligible per-service caps, and document uncapped services, overage risk, secret references and rollback/delete steps.

Cloud deployment has not been performed by this plan. Enable APIs, create Agent Engine resources, deploy or call managed services only after the cost/identity/region gates are recorded and the user confirms any remaining spend boundary. Billing was already enabled by the owner; this run created the all-services alert only, and made no account activation or spend-cap enforcement change.

## Acceptance order

1. Local/static review confirms default local fallback, strict explicit managed configuration, verified identity/household scope, bounded IDs, no transcript-to-memory path, and accurate unavailable state. Complete the synthetic CLI evaluation fixture and instructions without calling a model.
2. Local browser acceptance covers sign-in, household creation/selection, route reload, canonical reads/writes, Ask when locally configured, and sign-out; no browser-generated household state is allowed.
3. Cloud readiness review records project, region, quota, IAM, the configured ₹2,000 all-services alert, practical service-level controls, credits and resource ownership. The owner approved proceeding under the existing ₹2,000 alerts-only budget while informed that it is not a guaranteed total-project cap; credits and total-project hard-stop controls remain unverified.
4. Provision one Agent Engine resource for Sessions and Memory Bank only; do not deploy managed Runtime code as part of this household API integration. Capture resource IDs in local ignored configuration or Secret Manager, never Git. Gemini model inference remains at `AGENT_VERTEX_LOCATION`; managed context uses `AGENT_VERTEX_ENGINE_LOCATION`.
5. Authenticated acceptance proves a model tool trace, owned managed session persistence, cross-user/session denial, consented preference recall across two sessions, edit/revoke/delete propagation, and no private transcript leakage.
6. Review evaluation traces and cost, then deploy the FastAPI service and frontend only through the approved single-project rollout/rollback path.

Local adapters or successful health/HTTP checks do not close the cloud acceptance tasks in `docs/planning/IMPLEMENTATION_PLAN.md` or live MVPTasks.

## Managed context rollout checkpoint — 17 October 2026

The deployed three-request daily AI limit is an EcoLoop application setting, not a Google account quota. The main deployment workflow had set it to 3 even though the backend and manual deployment defaults are 12. The feature checkpoint raises it to 12 per authenticated UID per UTC day; failed calls still consume a slot because the slot is reserved before provider invocation. The assistant and photo candidate extraction share this counter.

Created one Agent Engine resource in `asia-south1` without deploying Agent Runtime code: `projects/ecoloop-staging-20261015/locations/asia-south1/reasoningEngines/8405027522533654528`. The project already has Vertex AI enabled. The Cloud Run runtime's existing `roles/aiplatform.user` includes Sessions and Memory Bank permissions, so this step added no IAM binding. A repo variable `ECOLOOP_AGENT_ENGINE_ID` points the main workflow to the resource. The assistant's model remains Gemini 3.1 Flash-Lite at `global`; the managed Sessions/Memory Bank region is independently configured as `asia-south1`.

The local feature branch configures managed Sessions with a 24-hour TTL and Memory Bank with the existing consented-preference-only adapter. Neither managed operation has yet been invoked or acceptance-tested; the blank Engine's existence and health's configured status are not proof. No preference content, session, model call, or deployment was sent as part of provisioning. The ₹2,000 all-services budget remains alerts-only, and credits/total-project hard caps remain unverified. See [the architecture note](../architecture/managed-agent-context.md) and [session journal](../knowledge/sessions/2026-10-17-managed-agent-context.md).
