# EcoLoop Consolidated Build Pack — review and scope guide

**Reviewed:** 2026-10-15

This directory contains a detailed design and engineering reference pack. It is not the current MVP scope authority and does not prove implementation, integration, deployment, or measured impact.

## Authority for current work

1. [`../planning/00_START_HERE.md`](../planning/00_START_HERE.md) is the active project entrypoint.
2. [`../planning/CURRENT_MVP_SPEC.md`](../planning/CURRENT_MVP_SPEC.md), [`../planning/DECISIONS.md`](../planning/DECISIONS.md), and [`../planning/IMPLEMENTATION_PLAN.md`](../planning/IMPLEMENTATION_PLAN.md) govern scope and execution.
3. The detailed blueprint in `EcoLoop_Consolidated_Handoff/` is a reference. If its broader roadmap or interaction model differs from the current MVP documents, the current MVP documents win.

## Scope reconciliation

- Current MVP navigation is **Home, Kitchen, Ask, Shop**. The older `DESIGN_SOURCE.md` list of Shop/Harvest, Circular Loop, Impact, and Bag/Profile does not describe the approved navigation.
- Household sharing is a **private, owner-recorded outcome/log** in the current MVP. It does not create a public offer, invite another user, verify recipient identity, or confirm physical handoff.
- Family membership, trusted-circle invitations, recipient acceptance/confirmation, live merchant or NGO integrations, container deposits/returns, and broader circular marketplace flows are deferred. Treat blueprint milestones or API examples for those behaviors as future options, not MVP commitments.
- Any impact display must distinguish recorded facts, estimates, and unknowns. Do not claim carbon, water, or waste savings unless the current product spec defines a defensible measurement and the required evidence is available.
- Food safety remains a human decision. AI-generated suggestions are not a safety determination or permission to share food.

## Pack contents

- `EcoLoop_Consolidated_Handoff/EcoLoop_Master_Build_Blueprint.md` — detailed product/technical reference.
- `EcoLoop_Consolidated_Handoff/EcoLoop_Master_Build_Blueprint.docx` and `.pdf` — dated exports of that blueprint; consult the Markdown source for navigable text and current repository scope reconciliations above.
- `EcoLoop_Consolidated_Handoff/diagrams/` — current diagram sources and renders.
- `EcoLoop_Consolidated_Handoff/DESIGN_SOURCE.md` — visual tokens and prior design rationale; the stale product-specific parts are superseded by the current four-tab MVP and canonical Stitch exports under `../prototypes/`.
- `EcoLoop_Consolidated_Handoff/EcoLoop_Editable_Diagrams.md` — editable diagram source index.

The pack’s former `legacy-diagrams/` folder has been moved intact into `../archive/2026-10-15-pre-consumer-replan/consolidated-build-pack-legacy-diagrams/`. The duplicate nested Stitch export has also been moved there; the canonical prototype files remain under `../prototypes/`.
