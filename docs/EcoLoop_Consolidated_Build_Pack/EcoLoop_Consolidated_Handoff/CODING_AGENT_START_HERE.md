# EcoLoop — start here (for Antigravity or other coding agents)

> **Current repository scope:** Before using this pack, read `docs/planning/00_START_HERE.md`, `CURRENT_MVP_SPEC.md`, `DECISIONS.md`, and `IMPLEMENTATION_PLAN.md`. Those current MVP documents take precedence over broader or older flows in this reference pack. The approved navigation is Home, Kitchen, Ask, Shop. Sharing is an owner-recorded private log; family invitations, recipient acceptance/confirmation, live partner integrations, deposit/tote loops, and broader marketplace flows are deferred. The canonical supplied Stitch exports are in `docs/prototypes/`.

**Read first**: `EcoLoop_Master_Build_Blueprint.md` in its entirety. Then `DESIGN_SOURCE.md`, followed by `EcoLoop_Editable_Diagrams.md`. The canonical visual project is https://stitch.withgoogle.com/projects/13582973110792237215; you need authenticated Stitch export/MCP or supplied assets for pixel-accurate implementation.

**Current status:** These documents and diagrams are complete design outputs. No functioning app, actual Memory Bank integration, live merchant OAuth, physical savings or Google Cloud deployment is asserted.

**P0 implementation sequence:**

1. Inspect authorized repository and Google Cloud permissions; get the current Stack/SDK/region compatibility and cost approval.
2. Build mobile-first Next.js UI with tokens/approved screen contracts: Home, Kitchen, Add Food, Review, Ask (recipe + shopping states), Food Action, Impact.
3. Add Python FastAPI + Firebase Auth/Firestore role checks and deterministic inventory/approval logic. Write a non-AI baseline and tests.
4. Connect **real** Gemini multimodal candidate extraction and explicit review; ensure `candidate != confirmed`.
5. Connect Google ADK orchestrator, Agent Platform Sessions and **consent-gated Memory Bank**. Prove preference survives two distinct sessions.
6. Return schema-valid React cards or A2UI only after validation; route actions through FastAPI. Mock all external partner/commerce operations unless OAuth rights verified.
7. Record a user-approved food/share/disposal outcome honestly; show status and data completeness, no fictional environmental savings.
8. Run gold tests (unit confusion, duplicate stocks, stale records, memory leakage, prompt injection, safety, cart block) and deploy via Firebase App Hosting + Cloud Run after approval.
9. Make a three-minute demo with a real agent trace and a clear mock/live distinction.

**Never** turn a Stitch mock into a claim of a real Google integration. External payment, NGO coordination and food-safety certification are not permitted by generative model alone. Report what was actually tested, what remains blocked and what user credentials/permissions are necessary.


