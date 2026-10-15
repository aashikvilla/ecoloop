# EcoLoop sustainability platform — control room
Version 0.1 · 15 October 2026 · Documentation and ideation delivered for review.

## Start here
This set defines a broad sustainability ecosystem and a staged path to testing it. The platform connects decision owners and qualified service providers through consent, evidence, approvals, handoffs and measured outcomes. Food is the proposed first proving ground; kitchen, recovery, organics, repair/reuse, energy and water enter through separate evidence gates.

Current authorization is research and documentation. The application remains the existing scaffold. No product implementation, deployment, partner transaction or environmental outcome is claimed by this delivery.

[Open the live execution harness](https://docs.google.com/spreadsheets/d/10PQygT-suDuX2pfbDOpP-Y_q81XkExWBPFP_60_2GiI/edit)
[Open the complete blueprint folder](https://drive.google.com/drive/folders/1mhYQLzTWc1uwqF9BkkkIy44y7R6GikpC)

## Document map and reading order

- [01 — EcoLoop Product Strategy and Sustainability Ecosystem](https://docs.google.com/document/d/1rs3iUC4BcXxQzqiNZcjSmBm4G3Hb0Gex9D-z5FHTjvQ/edit?usp=drivesdk) — High-level product thesis, actors, ecosystem incentives, domain boundaries, hypotheses, success measures and business model.

- [02 — EcoLoop User Journeys and Service Blueprint](https://docs.google.com/document/d/11chrS875giVwG42-Xxno8gEZmE_QAWcf_mxbNvSk6GE/edit?usp=drivesdk) — Eight actor journeys with service handoffs, happy paths, refusal, expiry, revocation, failure, measurement and acceptance criteria.

- [03 — EcoLoop High-Level Technical Architecture](https://docs.google.com/document/d/12rYbge56DPKN3xZhExVGi5xhkSeT6SkTrpw4pqfXWaY/edit?usp=drivesdk) — High-level technical architecture: components, trust boundaries, domain modules, data flow, storage, Google deployment and operations.

- [04 — EcoLoop Low-Level Contracts and State Machines](https://docs.google.com/document/d/1PXNgbvefLf9zp746gwDaJKkZv1MfyRwvuom_VWCI-5I/edit?usp=drivesdk) — Low-level contracts: entities, units, API behavior, versions, confirmation transactions, approval state machines, idempotency and errors.

- [05 — EcoLoop Decisions and Technical Tradeoffs](https://docs.google.com/document/d/1e7qkqxTXcsRbuZGwdKlXjikb7E2PUEvM1ppxWeSv9WI/edit?usp=drivesdk) — Twenty decisions with status, strongest alternatives, rationale, owner and revisit conditions. Proposed choices are not human approvals.

- [06 — EcoLoop Phase Plan and Granular Checklists](https://docs.google.com/document/d/1oZiltzUEUIGTSBJ-uRuxohY-N76VLnUEGk-PcHbblDg/edit?usp=drivesdk) — Twelve phases, 36 parent workstreams and 156 checkbox units, with prerequisites, acceptance and required evidence.

- [07 — EcoLoop Feasibility, Economics and Validation Gates](https://docs.google.com/document/d/1GCIPiUjTuctCCmiTkcClThPnGmlvMNVpnNTfj62T1Hk/edit?usp=drivesdk) — Feasibility across product/data/AI/technical/operations/time/economics, cost/token scenarios, validation and stop gates.

- [08 — EcoLoop Harness and Software Factory Operating Guide](https://docs.google.com/document/d/1cvbPg-sGtjgodvu24Yg9KtLASkuHJdwlIDeVfQvmnrs/edit?usp=drivesdk) — Operating harness, software factory role cards, work packets, review, context budgets, updates, recovery and session handoffs.

- [09 — EcoLoop Research Synthesis and 42-Source Register](https://docs.google.com/document/d/1D8rfAjNJ-ESK1njq1EWJl14-x-oR8PRIKtQJNSMl194/edit?usp=drivesdk) — Synthesis, contradictions, coverage limits and a linked register of all 42 source files.

## What is live and what is a snapshot
The Google Sheet is the authoritative live status record. Its Tasks tab has native completion checkboxes and input fields; calculated verification depends on Complete status, evidence, reviewer, update time and verified prerequisites. Phase progress recalculates from leaf units, avoiding duplicate parent counts. Decisions, Risks and Sessions provide the current disposition and next evidence.

Google Docs are editable narratives. Local Markdown and TASKS.json are dated review/recovery snapshots. No automatic two-way synchronization, repository monitoring, CI ingestion or agent scheduler is implemented. The harness works through native collaboration and formulas today. Its operating guide describes later automation candidates and the exact manual maintenance rules.

All 156 units start unchecked, including human scope and review tasks. Producing these documents does not implement their future capabilities. Owner roles must become named assignments before execution; effort fields remain blank until estimated. The default 6,000-token reading budget per leaf is a proposed context allowance, not actual account capacity or total inference cost.

## Roadmap
P00 planning acceptance -> P01 trusted foundation -> P02 deterministic baseline -> P03 household AI integration -> P04 deployed demonstration and submission.
P05 kitchen, P06 recovery, P07 organics and P08 permissioned pilot/economics are conditional extensions with their own operational gates.
P09 repair/reuse, P10 energy/water and P11 federation/scale require observed value, rights, qualified operators and viable economics before investment.

This is a dependency roadmap, not a promised calendar. The official contest deadline date is 18 October; exact portal cutoff, eligibility and account access still need confirmation. The feasibility document distinguishes the narrow submission path from the full platform.

## Non-negotiable design boundaries
Candidates require explicit human confirmation before canonical facts. Deterministic code handles quantities, permissions and deadlines. AI cannot certify food safety. Served/spoiled food cannot enter recovery. Human eligibility, current recipient capacity and handling evidence govern recovery; policy constants require applicable sources and qualified review.

External partner actions remain simulated until rights, authority and operational safeguards exist. Inventory and partner state remain tenant-scoped; inter-organization exchange uses selective grants/projections. Metrics retain stage, method, measurement origin, verification and attribution. No automatic kg-to-carbon conversion, unified eco-score or fabricated saving is proposed.

## Verification and current limits
All nine content documents were read back from native Google Docs and compared against the authored normalized text; headings and the 156 checklist entries were retained. The tracker was read in Google Sheets and exercised with temporary inputs: a checkbox without evidence stayed unverified; Complete plus evidence/reviewer/date verified one unit and opened its dependent; removing evidence reopened the dependent. Test inputs were restored, leaving zero implementation units verified.

Local previews and native-export renders of all six tracker tabs were inspected. The in-app browser could not load the Google Sheet; connector readback verifies native checkbox validation, formulas and values. Native checkbox controls render as values in the exported workbook, so their existence was verified through the Sheets API. No application or deployment testing is claimed.

Research coverage: all 42 folder files fetched and surveyed, with targeted deep reading and current primary-source checks. This is not independent re-auditing of every cited study, source link, spreadsheet formula or historical slide layout. Future-domain journeys are hypotheses. Original research files were preserved.

## First review packet
Read Product Strategy sections on the first actor/job and hypotheses; review DEC-PLAT-001 and the feasibility gates; then inspect P00 in the live tracker. The first unit is P00.01.01, source inventory and conflicts. Confirm actual owner and reviewer, then settle scope and access before authorizing coding.

A continuing session needs this control room, its active task ID, one relevant journey/contract, the current decision and latest session handoff. It should not reread the entire corpus by default.

