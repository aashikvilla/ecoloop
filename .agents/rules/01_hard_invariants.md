# Hard Invariants & Safety Protocols

These rules are non-negotiable across all components of EcoLoop:

1. **Food Safety & Biological Fitness**:
   - Machine learning models and vision algorithms cannot detect pathogenic microorganisms, bacterial toxins, or chemical spoilage.
   - Any AI suggestion regarding surplus food redistribution must contain the mandatory disclaimer:
     `"Notice: AI extraction does not assess food safety. Qualified human inspection and compliance with FSSAI regulations are required before dispatch."`
   - Plate leftovers, opened perishable containers, or items broken down from unverified sources must be tagged as `INELIGIBLE_FOR_DONATION`.

2. **Uncommitted Candidate Isolation**:
   - Inputs parsed by Gemini (`POST /v1/intake/parse`) are stored in a temporary/candidate state.
   - They MUST NOT mutate active inventory or dispatch workflows until the user reviews and confirms via `POST /v1/facts/confirm`.

3. **External Action Simulation**:
   - No payment API, checkout gateway, or logistics dispatch may be executed against live merchant endpoints without an active, explicit merchant agreement.
   - The `simulated: true` attribute must be preserved on all `ActionProposal` models in demo mode.

4. **Tenant Isolation**:
   - Every request to `/v1/*` endpoints must carry a verified tenant identifier extracted from the authenticated token claims.
   - Cross-tenant database queries or updates are strictly forbidden.
