# EcoLoop: user journeys and service blueprint

Version 0.1 · 15 October 2026 · Proposed experience; no workflow or impact claim validated by this document.

This document describes how people would use a broader sustainability platform, while distinguishing the first food prototype from later service hypotheses. The original household, kitchen, recovery and organic journeys come from the supplied Drive research. Reuse, energy and water journeys are new proposals requiring discovery. All examples below are synthetic. They do not establish a partner, legal clearance, operational capacity or successful transaction.

## 1. Shared experience contract

The visible sequence is **capture → review → confirm → evaluate → approve → execute or simulate → acknowledge → record outcome**. Each stage has an owner and a reason to stop. A proposal explains what will change, which evidence supports it, what remains uncertain, whose approval is needed and when it expires. The interface should show at most a small number of useful choices, including “do nothing,” “correct this” and “ask a person.”

The proposed state vocabulary is a product contract to be mapped to the technical schemas:

| Object | Important states | Meaning |
|---|---|---|
| Observation | Draft, candidate, confirmed, disputed, stale, withdrawn | Confirmation records a person's assertion; it is not scientific certification |
| Proposal | Needs information, ready, approved, rejected, expired, superseded | Approval applies only to the reviewed version and scope |
| External action | Simulated, queued, executing, succeeded, failed, canceled, unknown | Timeout does not prove failure; reconcile before retrying |
| Transfer | Offered, conditionally accepted, reserved, picked up, received, rejected, returned | Each physical stage needs its own acknowledgement |
| Outcome | Not measured, self-reported, measured, estimated, disputed, corrected | A correction preserves history and does not silently rewrite evidence |

The household, kitchen and recovery prototype uses synthetic records and simulated external actions. Put **SIMULATED — no order/pickup dispatched** on the proposal, approval screen, result, notification and export. A synthetic outcome remains synthetic even if a real model generated the proposal. Real users must never mistake mock partner capacity or seeded impact for live operational facts.

## 2. Shared service blueprint

| Stage | Frontstage experience | Backstage responsibility | Human owner and evidence |
|---|---|---|---|
| Join | Choose workspace, language and role; inspect permissions | Verify identity, membership, invitation and scope | Inviter and joining adult consent independently |
| Capture | Type, upload or optionally dictate; manual fallback | Store scoped source, parse candidates, preserve provenance | Source owner confirms collection rights |
| Review | Edit quantity, unit, time and uncertainty | Validate types and versions; reject unsupported fields | Responsible actor confirms relevant facts |
| Decide | See options and original supporting evidence | Apply deterministic quantities, deadlines and policies | Decision owner resolves missing/conflicting facts |
| Approve | Review exact action, destination, cost and expiry | Recheck role, version, revocation and capacity | Authorized approver signs the specific action |
| Handoff | Show pending and actual completion separately | Idempotent dispatch, callback reconciliation, custody events | Sender and receiver acknowledge their own stages |
| Follow up | Record outcome or explicitly choose unknown | Preserve measurement method and deduplicate events | Observer owns evidence; disputed entries are flagged |
| Recover | Cancel, correct, refuse or raise a dispute | Stop pending actions, retain needed audit evidence | Named operator handles escalation and resolution |

The UI should remain usable at mobile widths with 44px primary touch targets, keyboard navigation, readable contrast and labels that do not depend only on color. Camera, microphone, smartphone ownership and fluent English are not prerequisites. Operator-assisted entry is allowed only with recorded authority; shared devices must not expose another tenant after logout.

## 3. J-T01 — Join, share selectively and revoke access

**Scope:** first-prototype foundation, then all domains. **Actors:** an adult, workspace administrator, invited cook or colleague, partner organization and support operator. **Job:** collaborate without exposing unrelated personal or organizational information. **Starting condition:** no access is implied by an email address, public directory listing or previous membership elsewhere.

1. An administrator selects a workspace type and invites a person into a limited role. The invitation states the data and actions available, purpose, retention summary and expiry.
2. The person authenticates, accepts the invitation and chooses permitted personal sharing. A cook may see stock and today's headcount without grocery prices or private appointment details.
3. A member switches to another workspace. The active organization and role are always visible; searches, notifications and downloads remain scoped to it.
4. For a partner handoff, the source organization previews the exact batch or service fields to share. The receiving organization accepts the purpose and access scope. A transfer record connects the organizations without opening either full database.
5. The user reviews remembered information and withdraws optional sharing. New access is denied, pending proposals depending on revoked facts become invalid, and affected actors receive a minimal explanation.

**Refusal and failure:** expired invitations require a new invitation; an attempted role escalation is denied. A household owner cannot authorize another adult's personal calendar. If account ownership is disputed, support pauses the contested access and preserves the minimal evidence needed to resolve it. Deletion explains any documented retention requirement instead of claiming completed records can always vanish instantly. A completed physical transfer cannot be undone by deleting its digital record.

**Acceptance criteria:** AC-T01.1 tenant A cannot read or modify tenant B through search, export, direct links or cached screens; AC-T01.2 role change or revocation is checked again at approval and execution; AC-T01.3 a retained record has an explained purpose and restricted audience; AC-T01.4 a user can understand and correct what was saved.

**Measure:** invitation completion, permission misunderstanding, revocation propagation, support effort and authorization failures. The intended unauthorized-action count is zero; any observed violation blocks broader rollout. This is a design requirement, not a passed security result.

## 4. J-H01 — Household plans change before cooking

**Scope:** recommended first complete prototype. **Actors:** shopper, cook, two other adults and optional merchant. **Job:** avoid an unnecessary purchase or preparation decision when fewer people eat at home. **Trigger:** a permitted member says, “Two of us are eating out tonight.” Existing alternative: household chat, shared list and a visible use-first shelf. [Sources: J-S1–J-S3.]

1. The shopper uploads a receipt or manually enters received items. Extraction produces editable candidates; a receipt order is not automatically received stock. The shopper corrects a substituted item and confirms the actual quantity.
2. The cook sees confirmed stock, observation age, ownership and the planned meal. A stale quantity prompts a narrow confirmation rather than pretending the system knows the refrigerator.
3. A member submits the meal change. The system identifies the relevant date, meal and participants, asks one clarification if ambiguous, and shows the effect before confirmation.
4. Deterministic rules compare the new attendance with the current plan and cooking cutoff. The cook receives a revised quantity and an alternative using confirmed ingredients. Neither option certifies food safety.
5. The cook approves the revised plan or keeps the original. A shopper separately approves any proposed purchase. The prototype creates a simulated cart and records that no money or order moved.
6. After the meal, a participant records actual use and separately weighed avoidable edible discard, or selects “not measured.” The system asks only for useful follow-up, not daily surveillance.

**Refusal and failure:** the cook can reject the plan as impractical. A late cancellation after cooking produces an honest “preparation already occurred” state; it does not claim prevented waste. Conflicting updates require reconciliation. Missing inventory produces a confirmation request, not an invented substitute. Revoked personal sharing invalidates dependent proposals. A dispute over who consumed an item does not assign blame or silently debit another member. An unavailable merchant leaves a draft; it does not trigger another purchase channel automatically.

**Acceptance criteria:** AC-H01.1 every extracted item is editable before commitment; AC-H01.2 quantity/unit arithmetic is reproducible; AC-H01.3 the cook and buyer retain separate authority; AC-H01.4 stale facts or elapsed cutoff prevent approval of the obsolete proposal; AC-H01.5 simulated and unknown outcomes remain visibly labeled; AC-H01.6 a malicious instruction inside a receipt cannot trigger a tool action.

**Measure:** correct completion before cutoff, clarification count, correction time, household maintenance effort and avoidable edible grams per household-week when measured. Compare the same events with shared-list rules and ordinary Gemini. More orders or fewer suggested purchases alone do not prove waste reduction.

## 5. J-K01 — Kitchen attendance exception before final batch release

**Scope:** comparison scenario first; live pilot conditional on site access. **Actors:** attendance coordinator, chef, facility manager, server and, where relevant, qualified diet authority. **Job:** adapt a still-reversible production decision without undermining service or nutrition. **Trigger:** a group cancellation arrives before a particular batch's release time. [Sources: J-S3–J-S4.]

1. The manager establishes the menu, serving commitments, recipe units, batch stages and authority. The attendance coordinator submits expected counts with effective times and provenance.
2. Gemini may normalize a message or roster into a candidate exception. The coordinator confirms whether it replaces or adds to a previous count; no patient or student identifiers are required for the demonstration.
3. The rules compare the confirmed exception with the current batch state, ingredient constraints and last reversible decision. Already prepared food is excluded from claimed production prevention.
4. The chef reviews the exact proposed change, service buffer and affected menu components. A protected dietary requirement cannot be overridden by an attendance coordinator or model.
5. The chef approves a versioned batch instruction. The operator later records what was actually prepared; approval alone is not execution. Servers retain a route to report stockout risk or unexpectedly high demand.
6. Staff separately weigh preparation waste, untouched surplus, exposed service waste, plate returns and inedible material. The actual meals served provide the denominator. Any recovery offer starts J-R01 with new eligibility checks.

**Refusal and failure:** a message after the cutoff is recorded for learning and does not retroactively resize production. The chef may reject a reduction due to contractual service or uncertainty. An unreliable attendance feed falls back to a documented manual count. Duplicate events cannot reduce headcount twice. A nutrition conflict pauses the proposal for qualified review. Disputed weighing is retained with tare/method and corrected through an amendment. No plateau in plate waste should be “fixed” by cutting necessary food.

**Acceptance criteria:** AC-K01.1 the source and approving role are visible; AC-K01.2 cutoff and batch state are rechecked at approval; AC-K01.3 minimum service and approved diet constraints remain intact; AC-K01.4 waste categories cannot be merged into an unsupported edible total; AC-K01.5 measured execution is separate from suggested production.

**Measure:** timely exceptions acted on, staff minutes, stockouts, satisfaction and stage-specific edible grams per actual meal. Compare with a structured headcount sheet, staged cooking and current site tools. If plate behavior or late information dominates, stop expanding this AI workflow.

## 6. J-R01 — Eligible surplus to recipient-confirmed handoff

**Scope:** simulated prototype; live operation requires verified organizations and locally reviewed policies. **Actors:** donor, qualified recovery reviewer, dispatcher, driver and receiving organization. **Job:** complete a suitable, traceable handoff while preserving the right to refuse. **Trigger:** potentially eligible unused and unserved food exists. [Sources: J-S3, J-S5.]

1. The donor records a batch, quantity, source, packaging, preparation/holding information, applicable labels and handling evidence. A photo can document packaging; it cannot establish microbiological safety.
2. The workflow checks required evidence and applicable policy version. Served food, spoiled food and uncertain handling are never routed as automatically eligible. A qualified human reviewer records the eligibility decision and its basis.
3. A recovery coordinator checks current capacity, vehicle capability, timing and the receiving organization's food-specific policy. Organization identity, licensing where applicable and live capacity are separate checks.
4. Donor, recovery agency and recipient approve their respective commitments. The recipient can decline for dietary, timing, storage or capacity reasons without penalty. A reservation prevents double allocation; its expiry releases the reservation without reviving an expired food offer.
5. At pickup, the driver confirms actual batch, quantity and conditions. Changed conditions trigger renewed review or rejection. At receipt, the recipient independently records accepted quantity, discrepancies and disposition.
6. The recipient may later record consumption if observed. Otherwise the outcome says “accepted; consumption unknown.” Batch links support an authorized incident or recall notice and preserve the custody trail.

**Refusal and failure:** an unavailable vehicle leaves an unfulfilled offer; a map estimate never creates capacity. Cancellation before dispatch stops the queued action. Cancellation after pickup requires a human incident workflow, not digital rollback. Missing temperature evidence, an elapsed deadline or policy mismatch blocks transfer. A driver timeout results in an unknown status requiring reconciliation before retry. Disputes freeze public benefit claims while the responsible operator investigates. No generic time or temperature threshold is treated as universally valid across foods, jurisdictions and recipient policies.

**Acceptance criteria:** AC-R01.1 human eligibility and recipient acceptance are mandatory and separate; AC-R01.2 expired or revoked approval cannot dispatch; AC-R01.3 served/unsafe food cannot enter the edible route; AC-R01.4 repeated requests cannot create duplicate pickups; AC-R01.5 pickup and receipt need independent acknowledgements; AC-R01.6 a directory badge cannot substitute for verified evidence.

**Measure:** eligible offers, reasons for refusal, completed accepted mass, failures by stage, staff effort and actual logistics cost. Do not equate offers with meals consumed or hunger reduction. Compare with existing phone/WhatsApp coordination and structured forms before adding agent autonomy.

## 7. J-O01 — Apartment organics to verified treatment

**Scope:** later discovery and bounded operator pilot. **Actors:** resident, cook, housing-society officer, collector, authorized processor and municipal residual handler. **Job:** separate compatible material and establish whether the contracted treatment happened. **Trigger:** a scheduled collection or contamination exception. [Sources: J-S3, J-S6.]

1. The society records its locally applicable obligations and operator contract. Residents see the accepted-material instructions for that service; they do not need to scan every peel.
2. The collector records load identity, gross/tare weight and contamination. Multilingual notes can become editable structured observations. Uncertain special materials are referred to the appropriate service.
3. The operator accepts or rejects measured quantities with reasons and evidence. A collector's collection acknowledgement does not prove processor acceptance.
4. Accepted material enters a processing batch. The operator records additions, outputs, losses and residuals under a documented measurement method. Composting mass is not expected to equal input mass because moisture and process losses matter.
5. A qualified operator records treatment completion and any necessary output quality evidence. The society sees collected, accepted, processed and output stages separately. End use is recorded only if known.

**Refusal and failure:** incompatible or contaminated loads can be rejected without pressuring workers to handle unsafe material. Rejected food waste does not return to the edible donation queue. Missed collection triggers a service incident and an approved local alternative, not invented home-compost advice. A scale disagreement marks the load disputed; records retain both measurements and method. Contract revocation stops new bookings while existing custody and lawful disposal responsibilities remain assigned. Expired operator evidence requires renewed verification.

**Acceptance criteria:** AC-O01.1 material policy identifies locality, operator and version; AC-O01.2 accepted/rejected quantities reconcile with the documented measurement tolerance; AC-O01.3 processing needs an operator event; AC-O01.4 no reward is earned merely by generating more waste; AC-O01.5 worker correction and refusal paths are available.

**Measure:** contamination, missed pickups, accepted versus rejected mass, processing evidence completeness, worker minutes and service cost. Emissions or compost yield are not inferred from collection weight. Compare with bilingual signage, training and existing operator logs; physical capacity may dominate any software improvement.

## 8. J-U01 — Repair or reuse a durable item

**Scope:** future hypothesis; no current market or partner validation. **Actors:** owner, repair professional, reuse recipient, carrier and authorized specialist processor where required. **Job:** determine whether a particular item can continue useful service at acceptable cost and risk. **Trigger:** an owner plans replacement or disposal.

1. The owner declares ownership, item type, known faults and desired outcome. A model may extract a label or summarize symptoms; it does not certify electrical, structural or product safety.
2. The system offers a qualified inspection/quote or a disclosed-condition transfer where appropriate. Repair and reuse are separate choices with explicit cost, transport, availability and warranty terms.
3. The owner approves a quote or a specific recipient. Sensitive devices need an appropriate data removal step before handoff; the service must explain who is responsible for that step.
4. The professional or recipient inspects the item and confirms acceptance or a revised quote. A revised scope requires fresh owner approval. Transfer evidence records condition and custody.
5. Follow-up records whether the repair worked or the item remains in use. A listing or pickup alone is not a life extension or an avoided new purchase.

**Refusal and failure:** the recipient may refuse a misdescribed or unsafe item. The repairer may decline beyond capability. Quote expiry invalidates old approval. Ownership disputes pause transfer. Cancellation after repair work begins follows the agreed terms and a human dispute route. Unrepairable hazardous or specialist goods need an authorized destination, not a generic donation match. An unavailable provider leaves an unfulfilled request.

**Acceptance criteria:** AC-U01.1 condition and known limitations are visible before acceptance; AC-U01.2 quote changes require reapproval; AC-U01.3 the receiving actor confirms inspection; AC-U01.4 private device data responsibility is explicit; AC-U01.5 environmental benefit remains unknown without a supported replacement counterfactual.

**Measure:** quote-to-completed-repair rate, inspected transfers, total cost, continued use, disputes and service time. Compare with existing local repair/referral channels. Discovery must establish a recurring coordination problem before building a marketplace.

## 9. J-E01 — Investigate an energy anomaly

**Scope:** future hypothesis. **Actors:** bill owner, occupant, facility manager, utility and qualified technician. **Job:** understand an unusual consumption change and choose a safe next action. **Trigger:** a bill, meter or operator observation differs from an appropriate comparison period.

The owner grants purpose-specific access to a bill or meter series. Extraction candidates expose period, meter units, estimated readings and tariff changes for confirmation. Deterministic checks distinguish consumption from price changes. The interface asks about occupancy or weather only when relevant and consented. It offers an evidence summary and, where justified, a qualified inspection request. The user approves any appointment and charge; the prototype never controls equipment. A technician records findings, the owner approves the intervention, and later meter readings support comparison with the stated limitations.

**Refusal and failure:** insufficient data produces “cannot determine,” not an invented leak or faulty appliance. Critical cooling, medical equipment and occupant comfort constraints override an energy-saving suggestion. An unsafe condition is directed to the appropriate qualified or emergency process. An expired quote or changed scope needs fresh approval. Revocation stops new meter access; a pending appointment requires an explicit cancellation status. Billing disputes go to the utility process with evidence rather than a model's legal conclusion.

**Acceptance criteria:** AC-E01.1 units and periods are confirmed; AC-E01.2 consumption and tariff effects are separated; AC-E01.3 no autonomous control occurs; AC-E01.4 intervention and measurement are independently recorded; AC-E01.5 comparable-period limits are visible.

**Measure:** correct anomaly triage, unnecessary visits, resolution time, occupant comfort and metered consumption with context. A reduced bill is not automatically reduced energy. Discovery must verify data access, existing utility services and professional capacity.

## 10. J-W01 — Investigate and resolve a possible water leak

**Scope:** future hypothesis. **Actors:** resident, property manager, meter owner, water utility and qualified plumber. **Job:** identify an actionable issue without confusing meter error, shared demand or billing changes with a leak. **Trigger:** unexplained usage or a resident-reported visible problem.

The source owner submits an observation and grants access to the relevant meter scope. Candidate extraction requires confirmation of units, period and whether the meter serves one home or a whole building. The workflow asks for a safe observation or qualified inspection and identifies who controls access and repair approval. The property manager or owner approves a specific service visit and quote. The professional records the diagnosis and completed work. Comparable subsequent readings may support an outcome estimate; volume saved remains unknown if the counterfactual is weak.

**Refusal and failure:** an occupier can refuse access or request another appointment. A shared meter cannot attribute a leak to a named household without evidence. Urgent flooding follows the relevant emergency process; the app does not delay it for model interpretation. No automatic valve shutoff is proposed, particularly for critical services. An expired quote, revoked access, failed visit or disputed repair remains visible and requires human resolution. Tenant-landlord authority disputes pause nonurgent work.

**Acceptance criteria:** AC-W01.1 meter scope is explicit; AC-W01.2 access and repair approval are separate; AC-W01.3 no inferred household blame; AC-W01.4 service completion needs a professional/owner acknowledgement; AC-W01.5 no claimed saved liters from a photo alone.

**Measure:** justified inspections, verified fixes, repeat faults, resolution time, service cost and measured volume under comparable conditions. Compare with existing utility alerts and property-maintenance workflows before investing in AI.

## 11. Acceptance rehearsal and source traceability

For each journey, prepare a happy case, missing evidence, conflict, refusal, expiry, revocation, duplicate request, service failure and disputed outcome. Rehearse role switching and handoffs using the same evidence supplied to baseline workflows. Preserve the expected state, actual result, relevant source version and observer. Written acceptance criteria are not test results; no criteria in this document have been marked passed.

Use journey IDs and AC IDs in the implementation harness. A task can claim journey completion only when the whole authorized flow, its refusal behavior and outcome status are evidenced. The future reuse/energy/water journeys remain discovery tasks until their separate feasibility gates pass.

- **J-S1:** [User Journeys and Service Blueprint v0.1](https://docs.google.com/document/d/11eov-CZVYoHCn62bmzSrIJTmxmEP2ljtcu8154TWnhk/edit).
- **J-S2:** [Household and Quick Commerce Research](https://docs.google.com/document/d/12tDg1kWjJPiwcScTewJt7J9LB8pSzBUz41DIElFX8Bc/edit).
- **J-S3:** [Detailed Stakeholder Journeys and Service Blueprints](https://docs.google.com/document/d/1OcikSZpbILYW9OgeFI7RoI7itv45F9TBPpgekaouCoo/edit).
- **J-S4:** [Institutional Kitchen Research](https://docs.google.com/document/d/1JJTvxgdBlF5YAi-yPsreoBdSXn2FSQDHIFhJ1-bgCKU/edit).
- **J-S5:** [Safe Surplus Recovery Research](https://docs.google.com/document/d/1UW2eEYj2AaAgCWQ05ZvdXEfgIMJmLH-R5VKU5EYTQrk/edit).
- **J-S6:** [Circular Food and Community Workflows](https://docs.google.com/document/d/18RqL4wI5RXoO3FZnApyIFPeVGj-zEVbboXFaYF2chtM/edit).
- **J-S7:** [Web First PRD and supersession note](https://docs.google.com/document/d/1KVrXRreC8KQ_N7ams8pJlmKf_BndJAttAploHJLzuDk/edit).

