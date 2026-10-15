---
name: ecoloop-domain-engine
description: >-
  Execute domain-specific food waste reduction workflows, FSSAI surplus recovery compliance,
  and comparative benchmarking across the three scenario lanes (Household, Kitchen, Recovery).
  Use when validating food safety rules, calculating mass balance/waste diversion, or running
  the 23 annotated gold test cases.
---

# EcoLoop Domain Engine & Comparative Evaluation Skill

This skill defines the domain rules, regulatory boundaries, and comparative evaluation methodology for the EcoLoop decision copilot.

## Core Operational Lanes

### 1. Lane H — Household Change-of-Plans
- **Trigger**: Groceries purchased, but diner plans change (e.g. dinner for 4 becomes dinner for 2).
- **Core Workflow**:
  1. Multimodal receipt/pantry intake parses candidate inventory.
  2. User confirms verified stock.
  3. Plan change message parsed into structured headcount adjustment.
  4. Allowlisted tool deterministically recalculates recipe portions and flags ingredients already in stock.
  5. Simulated mock cart proposal generated for remaining missing items only.

### 2. Lane K — Institutional Cooking Cutoff
- **Trigger**: School, college, or workplace kitchen attendance update arrives.
- **Core Workflow**:
  1. Roster or attendance notes parsed.
  2. Allowlisted tool compares current timestamp against the immutable batch cooking cutoff.
  3. If before cutoff: batch size is safely scaled down, saving un-prepped raw ingredients.
  4. If after cutoff: alerts chef that batch is already committed; routes excess to safe holding.

### 3. Lane R — Eligible Surplus & NGO Recovery
- **Trigger**: Restaurant or caterer reports surplus batch.
- **Core Workflow**:
  1. Mandatory safety filter rejects plate leftovers or opened perishables.
  2. Qualified human supervisor logs temperature and cooking timestamp.
  3. NGO partner verifies transport capacity and cold chain availability.
  4. Receiving facility confirms dietary match and issues digital chain-of-custody acceptance.

---

## The 23 Gold Benchmark Cases

The evaluation suite validates algorithmic correctness against 23 annotated cases:
- **Household (H1–H8)**: Pre-cook cancellations, duplicate purchases, OCR unit confusion, adversarial prompt injection.
- **Kitchen (K1–K6)**: Batch cutoffs, dietary substitution violations, plate vs. unserved waste separation.
- **Recovery (R1–R9)**: FSSAI packaging eligibility, plate leftover rejection, cold-chain temperature thresholds, driver custody logs.

---

## References & Examples
- [Scenario Lanes Specification](./references/scenario_lanes.md)
- [FSSAI Regulatory Compliance Guidelines](./references/fssai_compliance.md)
- [Gold Cases Reference & Assertions](./references/gold_cases_reference.md)
- [Gold Cases Fixture JSON](./examples/gold_cases.json)
- [Automated 3-Way Benchmark Runner](./examples/eval_runner.py)
