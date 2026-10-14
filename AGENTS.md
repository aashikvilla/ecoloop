# EcoLoop Agent Instructions & Operational Contract

> **Scope**: Monorepo root (`/frontend`, `/backend`, `/docs`, `.agents/`)  
> **Target Project**: EcoLoop AI — Resource Decision Copilot (AI Builder Cup 2026)  
> **Key Architecture**: Next.js 15 (Firebase App Hosting) + FastAPI (Google Cloud Run) + Google ADK + Gemini (Vertex AI) + Firestore + Cloud Storage.

---

## 1. Core Operating Principles & Hard Invariants

All agents, workflows, and automated tools working on EcoLoop MUST strictly enforce the following hard invariants from the Master Product Specification:

1. **Food Safety Invariant**:
   - A model, photograph, or multimodal intake NEVER certifies food safety or microbiological suitability.
   - No plate leftovers or spoiled food can ever be routed to care recipients or NGOs.
   - Unused/unserved food offers require mandatory human food-safety eligibility review, temperature logs, and recipient capacity confirmation.

2. **Candidate Extraction vs. Verified Facts**:
   - Model outputs are **uncommitted candidates** (`POST /v1/intake/parse`).
   - They NEVER become canonical ground truth without explicit human confirmation (`POST /v1/facts/confirm`).

3. **Deterministic Tool Boundaries**:
   - Language models interpret ambiguous inputs and select allowlisted tools.
   - All arithmetic, portion calculations, cooking batch cutoffs, FSSAI eligibility checks, and permissions are handled strictly by deterministic Python code.

4. **Tool Authorization & Simulated Partner Actions**:
   - Tool calls NEVER authorize real-world purchases, transactions, or pickups autonomously.
   - All external integrations (e.g. Swiggy Instamart, Blinkit, NGO dispatch) are **SIMULATED** by default with an explicit `simulated: true` badge on `ActionProposal`.
   - Physical execution requires authenticated human approval (`POST /v1/actions/{id}/approve`).

5. **Tenant & Role Isolation**:
   - Strict tenant isolation enforced at the FastAPI layer via verified Firebase ID tokens and tenant claims.
   - Role boundaries: Household member, Institutional chef/headcount manager, NGO coordinator, and Waste processor operate under distinct privilege boundaries. No cross-tenant reads or cross-role escalation.

6. **Honest Measurement & Impact Claims**:
   - Never claim unmeasured CO2 or water savings.
   - Distinguish physically measured weights vs. simulated estimates vs. unknown metrics.

---

## 2. Monorepo Customizations & Available Skills

The workspace includes 10 production-grade skills and 7 operational rules under `.agents/`:

### Specialized Skills (`.agents/skills/`)
1. **`fastapi-cloudrun-service`**: FastAPI 0.115+, Pydantic v2, Cloud Run stateless deployment, Firebase ID token auth.
2. **`google-adk-orchestration`**: Single orchestrator loop, allowlisted Python tools, HIL approvals, trajectory tracing.
3. **`gemini-multimodal-structured`**: Official `google-genai` SDK, Pydantic `response_schema`, receipt OCR, injection defense.
4. **`firebase-fullstack-integration`**: Firebase App Hosting (`apphosting.yaml`), Firestore versioned state, signed Cloud Storage.
5. **`ecoloop-domain-engine`**: 3 scenario lanes, FSSAI 2019 compliance, 23 gold benchmark cases with `eval_runner.py`.
6. **`nextjs-app-router-mastery`**: Next.js 15 App Router, React 19 Server Actions, Server/Client component boundaries, streaming.
7. **`vertex-ai-search-agent-garden`**: Grounded RAG over FSSAI policy datastores and Model Garden foundation model management.
8. **`gcp-cloud-observability`**: GCP-native single-line JSON logging, Cloud Monitoring metrics, Cloud Trace OpenTelemetry correlation.
9. **`systems-thinking-domain-modeling`**: Physical mass balance conservation equations, stocks and flows, category carbon factors.
10. **`continuous-verification-cicd`**: Multi-step Cloud Build pipeline (`cloudbuild.yaml`), automated pre-push verification gates.

### Hierarchical Rules (`.agents/rules/`)
- `01_hard_invariants.md`: Safety, uncommitted candidates, simulation transparency, tenant isolation.
- `02_stack_and_deployment.md`: Cloud Run containerization, App Hosting settings, Gemini ADC credentials.
- `03_evaluation_and_benchmarks.md`: 3-way evaluation protocol (Rules vs Plain LLM vs EcoLoop ADK).
- `04_coding_standards_and_architecture.md`: Function length (<30-50 lines), naming, SRP, systems thinking.
- `05_nextjs_react19_standards.md`: Server components default, React 19 `useActionState`, mobile-first 360px a11y.
- `06_agent_driven_development_harness.md`: Spec & assertion-first development, Living Knowledge Items, minimal test harness.
- `07_gcp_cloud_observability_ci_cd.md`: Cloud Logging JSON envelopes, Cloud Trace headers, zero-downtime rollouts.

---

## 3. Systems Thinking & Coding Standards

- **Think in Feedback Loops**: Identify whether a component functions as a stock, flow, or sensor.
- **Function Design**: Max 30-50 lines per function. Single responsibility. Early returns over nested if-statements.
- **Strict Typing**: Type hints on all Python functions; strict TypeScript types with no `any`.
- **Continuous Verification**: Run `npm run build` and `python eval_runner.py` before committing changes.
