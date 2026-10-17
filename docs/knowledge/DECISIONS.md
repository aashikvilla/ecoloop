# Decision knowledge

## Use canonical API data in household destinations (2026-10-17)

Home, Kitchen, Ask, Shop and Activity must read household data from the authenticated API. Do not fall back to browser-generated records when auth, membership, API, assistant, capture, outcome, sharing or managed preference services are unavailable; show an explicit unavailable state instead. Keep canonical writes disabled until identity, database and idempotency acceptance is reviewed.

## Prepare account commands behind a default-off build flag (2026-10-16)

Local Kitchen/Shopping command UI and private history may be implemented while billing is deferred. Keep browser commands disabled by default until live identity/database acceptance and approval to enable them. The public build flag is a release control, not an authorization boundary; FastAPI identity, membership, version and idempotency checks remain mandatory. Share/outcome writes, extraction and managed-agent operations remain separate unfinished units. Root owns the shared transport and account integration; feature workers own separate files.

## Demo-first parallel implementation (2026-10-16)

Owner explicitly authorized coding, separate feature branches, GPT-6 Luna/high workers and regular pushed checkpoints. Implement a synthetic browser demo while billing is deferred, alongside a fail-closed canonical backend foundation. This is an execution exception for the hackathon, not cancellation of managed Gemini/ADK/context requirements. Keep authenticated data out of the local store; do not mark complete cloud phases from demo evidence. A single integrator owns shared files, coordinates up to three workers and prepares reviewable merges. Hourly continuation resumes unfinished authorized work when usage and access permit. See current execution plan/session.
Current register: [MVP-D01–14](../planning/DECISIONS.md). Household scope is resolved by current user direction and newer consumer/Stitch evidence.

Managed Sessions, consented Memory Bank and typed cards remain core. Actual household exports override contradictory DESIGN.md prose. Dinner adjustment is the first complete slice, not the entire product. Autonomous war-room reports do not override current user scope; external test counts are not local proof.

Old DEC-PLAT register and ADRs remain historical sources. M0 resolves exact contracts and cloud access. Documentation/guidance only; recommendations do not imply deployment approval.

## Confirm selected intake candidates atomically (2026-10-17)

Candidate review remains separate from canonical Kitchen facts until the owner confirms selected rows. A creator-scoped intake confirmation transaction checks current membership, intake version, candidate ownership and absent item IDs, writes selected observations once, and leaves unselected rows pending. Reuse each server-generated candidate ID as its canonical item ID so retries cannot create duplicates. Bind idempotency to the target intake as well as actor and command. Browser writes remain behind the default-off command flag until live acceptance is reviewed.


## Superseded source material (2026-10-16)

The broad platform archive and consolidated build pack were removed from the active checkout to reduce stale discovery paths; Git history retains them. The current spec, decisions and implementation plan in `docs/planning/` govern. Current navigation is Home, Kitchen, Ask, Shop; sharing is an owner-recorded private log. Family invitations, recipient confirmations, live partner integrations and deposit/tote/marketplace flows are deferred. Canonical user-supplied Stitch PNG/HTML files remain under `docs/prototypes/`.

Current user decisions: shared accessible UI primitives under `frontend/src/components/ui/`; shared navigation/layout under `frontend/src/components/layout/`; one central Tailwind v4 `@theme` token source in `frontend/src/app/globals.css`; mobile-first responsive development; Google Cloud/Gemini services for approved product integrations; no frontend/backend unit tests or dependencies. See [MVP-D15–16](../planning/DECISIONS.md).

## Single hackathon environment (2026-10-16)

Use one named Google Cloud/Firebase project and one environment for the hackathon by default; do not add staging/production separation unless the owner explicitly asks. Current project ID is `ecoloop-staging-20261015` (immutable); display name is “EcoLoop Hackathon.” Existing billing is off. The only listed billing account is closed and still linked to another active project, so inspect account-wide impact before reopening. The credits page failed to load; balance is unknown. See MVP-D17–18 and the current cloud setup session.

## Require explicit local assistant activation (2026-10-17)

Load local backend settings from the ignored `backend/.env` for development, with process environment taking precedence. Provider credentials and automatic provider selection do not authorize model calls: `AGENT_ENABLED` defaults to false and must be set true explicitly. Health reports the selected configured provider and activation state without validating credentials or calling a provider. Managed Sessions, Memory Bank and managed Agent Runtime remain separate unfinished requirements.

## Archive removed shopping entries (2026-10-17)

Shop removal is a versioned soft archive, scoped to the active household and authenticated actor, with an idempotent retry record. The active-list read filters archived rows after its existing bounded query, so removal preserves history without adding a Firestore index or changing Kitchen stock. A removal is reviewed explicitly before the command is sent.

## Forward photo bytes to Gemini without EcoLoop media persistence (2026-10-17)

The bounded household photo intake sends validated JPEG, PNG, or WebP bytes directly from the authenticated API request to the configured Gemini Developer API. EcoLoop stores only strictly validated candidate fields in the existing creator-private intake record; it does not write image bytes to disk or Cloud Storage, and no provider retention duration is claimed. Photo processing stays unavailable unless `AGENT_ENABLED=true` and a Developer API key are configured. The browser command flag remains default-off. See the photo-intake session for local verification and cloud acceptance gaps.
