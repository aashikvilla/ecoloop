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

## 2. Monorepo Structure & Workflow

```text
ecoloop/
├── .agents/                      # Workspace Customizations
│   ├── rules/                    # Hierarchical guidelines and constraints
│   ├── skills/                   # Modular runbooks & workflows
│   └── agents/                   # Agent configurations & prompts
├── frontend/                     # Next.js 15+ App Router, React 19, Tailwind CSS
├── backend/                      # Python 3.12+, FastAPI, Google ADK, Pydantic v2
├── docs/                         # Canonical product specifications and research
└── package.json                  # Root monorepo orchestration
```

---

## 3. Technology Guidelines

### Backend (`/backend`)
- **Runtime**: Python 3.12+ managed with `uv`.
- **Framework**: FastAPI with async route handlers, Pydantic v2 schemas (`pydantic-settings`).
- **Google Cloud Run**: Keep backend stateless; use Firestore for persistent state, Cloud Storage for media.
- **Google GenAI SDK**: Use the official `google-genai` SDK (`from google import genai`) with Vertex AI / API keys.
- **Authentication**: Validate Firebase ID tokens on every protected endpoint (`firebase-admin.auth.verify_id_token`).

### Frontend (`/frontend`)
- **Framework**: Next.js 15 App Router with TypeScript.
- **Styling**: Tailwind CSS with rich, accessible components, dark-mode first, and visible mock indicators.
- **Hosting**: Firebase App Hosting (`apphosting.yaml`).
- **API Communication**: Type-safe REST client communicating with the FastAPI backend.

---

## 4. Scenario Testing & Gold Cases

When developing or modifying features, validate against the three core scenario lanes:
1. **Lane H (Household)**: Plan changes, duplicate grocery items, receipt OCR, mock cart top-up.
2. **Lane K (Kitchen)**: Headcount changes, batch cooking cutoff enforcement, separate edible/inedible waste weighing.
3. **Lane R (Recovery)**: Packaged eligible surplus, human food-safety review, chain of custody logs.

Refer to `.agents/skills/` for step-by-step procedures and specialized runbooks.
