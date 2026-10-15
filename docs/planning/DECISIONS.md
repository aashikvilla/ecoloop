# Household MVP decision register

15 October 2026. “Carried forward” means explicitly present in the latest user/source direction; “Recommended” identifies implementation judgment awaiting normal review. No entry records cloud deployment or partner approval.

| ID | Disposition | Decision | Alternative and tradeoff | Revisit trigger |
|---|---|---|---|---|
| MVP-D01 | Carried forward | Solo-first household food assistant; optional family later | Broad ecosystem/operator platform offers breadth but multiplies workflows and operational risk | Proven household retention and a separately funded partner problem |
| MVP-D02 | Carried forward | Follow ten supplied Stitch screens through Home/Kitchen/Ask/Shop plus reusable flows | Old dark cockpit and unrelated DESIGN.md navigation conflict with actual screens | New explicit design decision |
| MVP-D03 | Carried forward | Next.js/Firebase App Hosting + FastAPI/Cloud Run + real ADK/Gemini | New framework rewrite adds migration cost without product evidence | Measured deployment blocker |
| MVP-D04 | Carried forward from ADR-016/017 | Managed Sessions and consented Memory Bank are core; managed Runtime preferred | Local persistence is easier but does not meet source proof; fallback needs explicit blocker and equivalent managed-context proof | Access spike with reproducible failure and named owner |
| MVP-D05 | Carried forward from ADR-018 | Typed React cards are core; A2UI renderer package optional | Arbitrary GenUI increases execution and validation risk; package adoption adds preview dependency | A supported renderer measurably reduces code without weakening contracts |
| MVP-D06 | Recommended | Five fixed card schemas and one orchestrator | Many deployed agents increase coordination/context cost; text-only misses current interaction requirement | Measured task quality bottleneck |
| MVP-D07 | Carried forward | Confirmed Firestore observations are canonical; memory stores preferences | Model/session truth would blur stale facts and inferred preferences | Never relax confirmation/security boundaries |
| MVP-D08 | Carried forward | Share before waste; private household log now, community interest simulated | Full NGO marketplace needs eligibility, recipient capacity and physical operations | Qualified partners, reviewed policy and readiness proof |
| MVP-D09 | Recommended from rights gap | Manual shopping list and permitted outbound handoff | OAuth/order-history sync is useful but rights/API access unverified | Written access and an implemented permissioned connector |
| MVP-D10 | Carried forward | Recorded activity with source/units; no automatic savings score | Carbon/financial scores are appealing but unsupported by present counterfactual data | Reviewed method, factors and measured inputs |
| MVP-D11 | Recommended | One modular backend and transaction-based command authority | Per-feature microservices add deployment seams; browser writes duplicate authority | Demonstrated scaling/team isolation need |
| MVP-D12 | Recommended | Existing Sheet reused, new MVP tabs; old 156-unit plan archived | Multiple writable status copies drift; automatic sync adds a product to build | A real operational sync need with owner and conflict policy |
| MVP-D13 | Reconciliation | Current explicit Stitch scope governs; dinner exception is first slice | Later autonomous war-room reports propose dinner-only; they do not replace this user's scope | Direct human scope change |
| MVP-D14 | Reconciliation | Archive superseded guidance and examples, preserve app scaffold/source assets | Hard reset cannot restore nonexistent household code and risks untracked work | Deliberate implementation tasks replace scaffold incrementally |

## Open implementation facts

| Gap | Recommendation / owner | Planned resolution |
|---|---|---|
| Project, region, IAM and model quota | Technical lead validates supported managed stack before feature expansion | M0.02.01 |
| Media/session retention and deletion semantics | Start with minimum justified retention, expose deletion; owner decides exact duration from service behavior | M0.02.02 and M3.01.02 |
| Consent-safe memory generation and deletion | Use approved preference events only; revocation filter immediately excludes results | M3.01.02–03 |
| Dates and quantity schema | Unknown is first-class; no universal safety constants | M0.01.03 and M2.02.01 |
| Merchant URL/app-link permission | Default generic permitted links/manual fallback; no account sync claim | M4.01.03 |
| Community food execution | No live dispatch in MVP; keep simulated interest honest | M4.01.02 |

Architecture decisions should record source, options, consequence, owner and evidence when changed. Do not reopen resolved scope each session or treat a recommendation as approval for a production mutation.
