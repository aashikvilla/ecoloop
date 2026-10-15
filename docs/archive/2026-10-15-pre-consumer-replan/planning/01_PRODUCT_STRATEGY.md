# EcoLoop: product strategy and ecosystem thesis

Version 0.1 · 15 October 2026 · Proposed for review · Product owner: human founder; research and document maintenance: assigned agent.

This is a design and validation proposal. It does not approve a launch, partner relationship, pilot, implementation budget, or environmental claim. The repository contains starter application code; the product described here is not yet established as implemented. Research supports investigating specific failures, but no EcoLoop user trial or incremental impact result has been established. The connected Drive research is the source corpus; this document adds a broader platform hypothesis and makes its assumptions explicit.

## 1. Product thesis

EcoLoop could become a trusted coordination platform that helps people use resources well, connect with appropriate service providers, and document what actually happened. Its essential product loop is **observe → confirm → decide → approve → hand off → measure → learn**. Food is the first domain in which to test that loop. Repair, reuse, water and energy are distinct future domains with their own evidence, policies and qualified actors.

The initial job is concrete: when circumstances change, help the person with authority act before an irreversible resource decision. A household cook receives a meal cancellation before starting dinner. A chef receives an authorized attendance change before releasing the final batch. A recovery coordinator learns that a recipient cannot accept a food type before dispatch. Success means a correct, timely, accountable decision with acceptable effort. A persuasive chat answer is insufficient.

The research already finds substantial competition in shared inventory, recipes, kitchen forecasting, donation matching and collection. Therefore the proposed differentiation is **permissioned coordination across people, with timely evidence and a completed handoff**. That remains a hypothesis, not a defensible market position until tested against existing workflows. [Sources: Drive PRD and competitive landscape, S1–S2.]

## 2. Why a platform, and why begin narrowly

The ecosystem opportunity is broader than household waste. Resources pass between organizations whose records, incentives and authority differ. A restaurant may know its surplus; a food bank knows its acceptance policy; a driver knows current capacity; a recipient knows actual demand. A housing society knows its service contract; a collector observes contamination; a processor knows whether a load was treated. No single participant sees the whole outcome.

A useful platform can make these boundaries explicit without demanding unrestricted access to each participant's systems. A transfer shares only the approved subset needed for the transaction. A household member may belong to a workplace, housing society and repair group, yet those memberships do not merge private records. The network becomes useful through dependable relationships and evidence, rather than collecting everything into one personal profile.

Starting every domain together would create several marketplaces, legal regimes and operational services before proving any one benefit. The recommended first implementation is one household changed-plan flow with a simulated external action. Kitchen and recovery cases initially challenge the shared model through small scenario exercises; they do not become three production products. If authorized kitchen access is materially better than household access, the founder can choose kitchen first through the decision register. The choice should follow access, residual pain and measurability. [Sources: S3–S5.]

## 3. People, value and decision rights

| Participant | Job and potential benefit | Authority retained | Principal burden or risk |
|---|---|---|---|
| Household shopper | Buy appropriate quantities using current evidence | Purchase, budget, substitutions | Extra logging and commercial influence |
| Cook or household coordinator | Adapt preparation to actual needs | Cooking plan and practical feasibility | Unpaid coordination work; surveillance |
| Other adult member | Communicate relevant changes | Own sharing and meal participation | Private schedules exposed |
| Kitchen chef and manager | Handle exceptions before preparation cutoff | Production, staffing and service commitments | Stockouts, nutrition or service degradation |
| Merchant or retailer | Fulfil authorized demand; offer suitable packs | Prices, stock and commercial terms | Integration cost; pressure to maximize sales |
| Donor | Offer potentially eligible unused food | Offer accuracy and withdrawal before transfer | Handling obligations and unsafe incentives |
| Recovery agency | Accept suitable offers within actual capacity | Eligibility review and dispatch | Staff, vehicles, records and cold chain |
| Receiving organization | Obtain suitable food when needed | Acceptance, refusal and downstream use | Unsuitable food; pressure to accept |
| Logistics worker | Execute a safe, feasible handoff | Report conditions and refuse unsafe work | Unpaid waiting; sensitive location tracking |
| Housing society and collector | Improve segregation and service reliability | Budget, collection and rejection | Labor, contamination and unequal penalties |
| Authorized processor | Receive compatible material and evidence treatment | Feedstock acceptance and process operation | Equipment, contaminants and output markets |
| Repairer, reuse recipient | Extend actual use of suitable goods | Diagnosis, quote, inspection and acceptance | Safety, ownership, warranties and disputes |
| Utility or qualified technician | Resolve a verified resource issue | Diagnosis and authorized intervention | Access to meters, assets and occupant needs |
| Municipality or auditor | Assess service delivery with suitable aggregates | Regulatory or contract oversight | False assurance from incomplete records |

Care facilities, schools and hospitals have additional constraints. They are not a convenient default destination for surplus. A household owner cannot consent on behalf of other adults, and an employer cannot turn resource tracking into worker performance surveillance. Minors should not need accounts for the initial product. Clinical requirements and critical utility services remain under qualified human authority.

## 4. Domain boundaries and expansion sequence

**Food prevention:** connect purchase observations, confirmed stock, participation and preparation decisions. Orders do not prove delivery; photographs do not prove quantity, freshness or safety. Ownership, observation time and corrections must remain visible. Food consumed is distinct from food whose disposal was prevented.

**Institutional food:** separate preparation mistakes, untouched surplus, exposed service-line discard, plate returns, inedible matter and packaging. The research shows that a headcount product may miss the principal cause of plate waste. Taste, portion choice and service design may be better interventions. No kitchen is assumed underserved merely because enterprise products exist. [Source: S6.]

**Food recovery:** maintain donor, recovery agency, driver and recipient responsibilities. Independent human eligibility review, appropriate handling evidence, recipient fit and available transport precede transfer. Partner identity is not proof of batch safety or current capacity. Expiry and changed conditions can invalidate earlier approval. [Source: S7.]

**Organic recovery:** route eligible material under the local operator's accepted-material policy. Collection, acceptance, processing and usable output are separate events. Wet material is not automatically compostable in any system, and collected kilograms are not automatically diverted kilograms. Food recovery and organic processing need separate operational queues and rules. [Source: S8.]

**Repair and reuse:** begin with an item owner requesting a diagnosis, quote or transfer. Require proof of ownership where appropriate, condition disclosure, privacy cleanup and recipient inspection. Hazardous or specialist goods must go to appropriate authorized channels. The first hypothesis is reduced coordination friction, not automated technical certification.

**Energy and water:** begin with billing or meter anomaly explanation and a qualified service referral. Weather, occupancy, tariffs, meter coverage and critical services change interpretation. No autonomous thermostat, valve or electrical control is proposed. Resource reductions require comparable measurement and a defensible counterfactual, not a bill photo alone.

Upstream agriculture, cold chain, manufacturing, municipal procurement and biodiversity remain discovery areas. Their physical infrastructure, data rights and specialist decisions make them separate products. The seed-to-soil map is a system boundary map, not authorization to build every stage. [Source: S9.]

## 5. Minimum coherent product and explicit exclusions

The first coherent experience contains membership and consent, one evidence capture path, editable extraction candidates, confirmed versioned facts, a changed-plan event, a deterministic calculation, a proposal requiring the correct approval, a conspicuously simulated action and an outcome record allowing “not measured.” It must demonstrate refusal and correction as well as success. Keyboard use, readable uncertainty, language fallback and low bandwidth behavior are part of the experience.

The first product does not require continuous pantry surveillance, unrestricted email or calendar ingestion, real merchant checkout, public recipient discovery, citywide dispatch, points redeemable for money, sensor installation, carbon credits or a unified sustainability score. Optional integrations enter only after rights and value are demonstrated. A public provider capability announcement does not grant this project access to accounts or payments. Historical documents that describe possible Swiggy integration must be read with this distinction. [Sources: S1, S3.]

The smallest network pilot should connect a few existing, trusted organizations within one locality. Manual partner verification and existing phone workflows can remain in place. A public marketplace adds discovery, liquidity, moderation, fraud, dispute resolution and support costs. Those costs require a separate decision; they are not incidental features of a directory.

## 6. Where generative AI earns its place

Generative AI is plausible for multilingual text or voice interpretation, messy receipt and roster extraction, evidence summaries, clarification questions, and explanation of an already checked proposal. It can reduce translation and transcription work across participants who do not share the same software. Source pointers and editable fields make errors recoverable.

Arithmetic, units, inventory updates, permissions, expiry, cooking cutoffs, capacity reservation and impact aggregation remain deterministic. Food safety, clinical suitability, electrical diagnosis and legal conclusions require appropriate evidence and qualified review. An agent may select an allowlisted operation; it cannot enlarge a user's authority. A parsed statement remains a candidate until the responsible person confirms it.

The comparison should separate the value of structured workflow from the value of AI. Test the same cases with a simple form and rules, ordinary Gemini given equivalent evidence, an accessible incumbent workflow, and EcoLoop. If rules produce the same correct result with lower effort and cost, retain the workflow and remove the unnecessary model call. If translation and extraction help while orchestration does not, keep only translation and extraction. Added compute, latency, error correction and support count against the benefit. [Sources: S4–S7.]

## 7. Product hypotheses and falsification

All sample sizes below are proposed feasibility exercises, not statistically powered efficacy claims. Set meaningful improvement thresholds with users before collecting outcomes; do not select favorable thresholds after seeing results.

| ID | Hypothesis | Minimum learning exercise | Evidence that changes or stops the plan |
|---|---|---|---|
| HYP-01 | Important meal changes miss the cook before preparation | Reconstruct 12–20 consented episodes across buyer/cook roles | Misses rare, happen after cutoff, or chat/list solves them |
| HYP-02 | Verified inventory can remain useful at low effort | Follow selected perishable batches from received quantity to use/disposal | Corrections and maintenance exceed benefit; provenance stays unresolved |
| HYP-03 | Kitchen unstructured exceptions improve production decisions | Audit one willing site's stage-specific waste and decision deadlines | Waste mainly plate behavior; rules or existing forecast suffice |
| HYP-04 | Recovery information failures reduce eligible completed handoffs | Review consecutive authorized offers with eligibility and refusal reasons | Transport, funds, safety or capacity dominate instead |
| HYP-05 | Organic handoff evidence improves contract performance | Reconcile collector and processor records for one service route | Existing logs suffice; missing processing capacity dominates |
| HYP-06 | Reuse coordination increases completed useful transfers | Observe qualified repair quotes and inspected transfers | Unrepairable goods, price or recipient demand dominate |
| HYP-07 | AI materially improves a difficult user task | Compare equivalent cases and permissions across baselines | No correct-completion or effort improvement net of model costs |
| HYP-08 | A buyer will fund the verified workflow | Price discussion and a documented paid-pilot commitment | Interest never becomes budget ownership or acceptable economics |

The household lane explicitly contains counterevidence to “more quick-commerce orders cause waste.” Orders may replace another channel or enable smaller purchases. Measure delivered quantities and actual disposal across all channels. The recovery lane also warns that country-specific donor policies and legal protections do not transfer automatically. These are reasons to narrow the causal claim, not reasons to fabricate a larger market estimate. [Sources: S5, S7.]

## 8. Outcome model and measurement contract

The platform should report **completed, authorized decisions with outcome evidence** as a service measure, accompanied by domain-specific physical outcomes. It should not collapse food kilograms, repair counts, water volume and energy into one unexplained score.

| Domain | Physical measure | Denominator and necessary context |
|---|---|---|
| Household | Avoidable edible discard mass | Household-week and edible mass purchased; missing observations shown |
| Kitchen | Edible waste mass by stage | Actual meals served, menu and service period |
| Recovery | Accepted and delivered eligible mass | All independently eligible offers; consumed quantity separate or unknown |
| Organics | Collected, rejected, accepted, processed and output mass | Route/batch and dates; moisture and added material accounted for |
| Reuse | Completed transfer or repair; continued use | Eligible cases, time in use and replacement intent |
| Energy | Metered consumption | Comparable periods, weather/occupancy and asset boundary |
| Water | Metered volume and verified repair | Meter coverage, period and concurrent demand changes |

Every displayed metric needs method, source, period, owner, measurement status and uncertainty. “Measured,” “self-reported,” “estimated,” “simulated” and “unknown” cannot be visually interchangeable. Duplicate handoffs must not double-count a batch. Rejected or returned material remains visible. Negative outcomes, missed meals and extra transport are included.

Environmental estimates require transparent factors and plausible displacement. Food delivered does not prove food production avoided; a repaired appliance may use more operating energy; lower bills may result from tariffs. Report observed physical quantities first. Keep modeled environmental scenarios in a separate view until their assumptions and added transport/compute burden can be defended. [Sources: S8–S9.]

## 9. Business model and ecosystem incentives

Four models deserve comparison: a small-site kitchen subscription, an organization-paid coordination service, a housing-society service assurance subscription, and a household offering subsidized by a disclosed organizational buyer. Household willingness to pay is unknown. Institutions may offer clearer budget ownership but longer procurement, onboarding and support cycles. Recovery agencies may need funding rather than another subscription.

Merchant referral revenue creates a conflict with buying less. If considered later, disclose it and prohibit ranking by commission where it conflicts with the user's stated objective. Charging for raw donated or processed kilograms risks rewarding excess creation. Start with workflow access or agreed service performance, not unsupported carbon credits. No business model should sell private meal, health or occupancy data.

Pilot economics must include onboarding hours, support, verification labor, model inference, storage, messaging, integration maintenance and dispute handling. Evaluate contribution margin per active organization and cost per correctly completed decision. A cheap model call can sit inside an expensive human service. The platform should not hide unpaid household or worker effort as “free operations.”

Network effects are a possibility: accurate local capacity and reliable repeat partners can make future matches easier. A sparse network can also make the service worse through travel, expiry and unavailable recipients. Test local density before expansion. The defensible asset, if one emerges, is trusted operational relationships and consented outcome history; raw data volume alone is not a moat.

## 10. Rights, equity and operational trust

Consent must specify purpose, audience, retention and withdrawal. Give users a view of stored context, a correction route, export and deletion handling. Some transaction or safety records may need retention; explain the basis and limit access instead of promising instantaneous erasure of everything. Revocation prevents new sharing and invalidates pending dependent actions. It cannot physically reverse an already completed handoff.

Each participant needs a refusal path without a punitive sustainability score. Recipients may decline unsuitable food; drivers may refuse unsafe work; cooks may reject impractical instructions; residents may choose manual entry. Worker-facing interfaces should support short, accessible tasks, not mandatory phone ownership or constant tracking. Community rankings should be opt-in and use comparable denominators; collective statistics must not expose a household's personal behavior.

Disputes require a human owner, evidence preservation, response targets and correction history. A platform “verified” badge must state exactly what was checked, when, and what remains unknown. Identity, licensing where applicable, capacity, batch eligibility and treatment completion are separate facts. The product cannot convert a directory listing into an operational guarantee. [Sources: S7–S8.]

## 11. Feasibility and staged commitment

**A constrained technical demonstrator is plausible**, subject to deployment, model access and actual contract verification. The Google-oriented stack described in the master specification can support typed intake and controlled actions. **A live sustainability network is not yet proven feasible**: partner access, lawful operations, staff capacity, data quality, demand and unit economics are unresolved. Food recovery has greater physical and safety dependence than a household decision demo. Energy and water need separate metering and professional relationships.

Recommended sequence: establish evidence and permissions; deliver one reproducible food decision flow; compare it fairly; run a consented local pilot if the comparison supports it; add a bounded partner handoff; then test organic recovery or another domain independently. Each expansion needs an accountable owner, a source of reliable observations, explicit rights, an outcome measure and a reason existing tools are insufficient.

The harness should link each feature to a hypothesis, journey, decision and acceptance record. Mark a task complete only when its stated deliverable and evidence exist. A proposed action is not executed, a written test is not passed, and a research paper is not product validation. Schedule discovery work in small context packets so agents can resume from decisions and evidence without loading the whole research archive. Product scope changes require a dated decision; they should not arrive through unchecked checkbox drift.

## Sources and research status

These links identify the supplied research corpus, not a fresh independent verification of every external reference. See `research/PRODUCT_SOURCE_REVIEW.md` for read depth and limitations.

- **S1:** [EcoLoop PRD v0.1](https://docs.google.com/document/d/1n6JeH1l3uFsU0Q9ygkUcf586WD-dJ0LHtW4xeoXPHz4/edit).
- **S2:** [Competition and Quick Commerce Landscape](https://docs.google.com/document/d/1LHYWiyjd-j92PRzih7CxnC1YiBUD9kCeL1eZP1HRqsU/edit).
- **S3:** [Master Product Specification](https://docs.google.com/document/d/1vUPWozAbRPcEhdLW0Bd9gAhhLKYXsY8Kn3s0t8wiKHA/edit).
- **S4:** [Detailed Stakeholder Journeys and Service Blueprints](https://docs.google.com/document/d/1OcikSZpbILYW9OgeFI7RoI7itv45F9TBPpgekaouCoo/edit).
- **S5:** [Household and Quick Commerce Research](https://docs.google.com/document/d/12tDg1kWjJPiwcScTewJt7J9LB8pSzBUz41DIElFX8Bc/edit).
- **S6:** [Institutional Kitchen Research](https://docs.google.com/document/d/1JJTvxgdBlF5YAi-yPsreoBdSXn2FSQDHIFhJ1-bgCKU/edit).
- **S7:** [Safe Surplus Recovery Research](https://docs.google.com/document/d/1UW2eEYj2AaAgCWQ05ZvdXEfgIMJmLH-R5VKU5EYTQrk/edit).
- **S8:** [Circular Food and Community Workflows](https://docs.google.com/document/d/18RqL4wI5RXoO3FZnApyIFPeVGj-zEVbboXFaYF2chtM/edit).
- **S9:** [Seed-to-Soil Journey and Stakeholders](https://docs.google.com/document/d/1ZityJ-yn_k3l1su2MGfHcszYARi-Qk-t20SbCuZcDEU/edit).

