# EcoLoop implementation status

Updated 16 October 2026. This is a repository snapshot, not synchronized with the live MVPTasks Sheet. The Sheet remains the only authority for task status and completion.

## Implemented locally

- Home, Kitchen, Ask and Shop run as an isolated browser demo backed by synthetic browser state. Capture, review, suggested actions and scripted Ask examples are not canonical household writes or Gemini responses.
- FastAPI includes authenticated, household-scoped API boundaries, Firestore repository transactions, owner-private sharing/activity endpoints and version/idempotency checks. The code exists; live identity, authorization, data and transaction behavior still need proof.
- `/account` provides Google sign-in code and separate read-only Kitchen/Shopping reads. Firebase Web configuration and Authentication setup are prerequisites; no live sign-in or household read is claimed.
- Canonical command UI code exists behind an opt-in flag. It remains disabled until live identity, membership, Firestore and conflict/retry behavior are verified. The Home/Kitchen/Ask/Shop demo store is still separate from canonical API data.
- Five fixed assistant card renderers validate backend-shaped envelopes. Current demo examples are scripted; they are not model output and cannot approve canonical actions.

## Cloud and model state

- Google Cloud/Firebase project: `ecoloop-staging-20261015` (display name “EcoLoop Hackathon”). It is the one hackathon project and environment; its immutable ID still contains “staging”.
- Firestore Standard database was created in `asia-south1` (Mumbai). The create response reported `freeTier: true`; billing remains off. Deny-all Firestore security rules were compiled and deployed. Indexes are not deployed. A data-only seed created and read back five synthetic documents: one household, one member and three food observations. The records carry `synthetic: true`; food dates are `UNKNOWN`. This proves the seed write/read and rules deployment only, not application authorization or canonical flows.
- Firebase Authentication is not initialized. The seed's Auth user step returned `CONFIGURATION_NOT_FOUND` and was skipped; no judge Auth user exists yet. Initialize Authentication in Firebase Console and enable a sign-in provider before creating it. Current `/account` UI uses Google sign-in; email/password judge sign-in UI is not implemented.
- Gemini/ADK implementation is in progress on a separate branch and is not integrated or verified here. No live Gemini response, managed ADK orchestration, managed Sessions or consented Memory Bank is claimed.
- Cloud Run and Firebase App Hosting are not deployed or configured. Billing is off and any paid hosting/model deployment is blocked pending owner review of billing scope, project-linked resources and cost controls.

## Next actions

- [ ] Initialize Firebase Authentication in the console and enable the provider needed for the intended sign-in flow.
- [ ] After Auth initialization, create the synthetic judge Auth user with the seed helper; keep its password out of chat, source control and logs. The five data-only seed documents already exist and the helper will not overwrite them.
- [ ] Deploy the required Firestore indexes and verify API reads/writes, identity, active membership, version conflicts and idempotent retries. Client Firestore rules currently deny all client access by design.
- [ ] Integrate and verify the Gemini/ADK branch using only synthetic inputs until privacy, consent and retention decisions are implemented.
- [ ] Add the missing judge email/password UI or use the supported Google sign-in identity with a matching seeded membership; do not assume the two identities are interchangeable.
- [ ] Connect approved Home/Kitchen/Ask/Shop actions to canonical APIs without silently treating demo state as household truth.
- [ ] Complete managed Sessions, consented Memory Bank, deletion/revocation behavior and two-session evidence.
- [ ] Revisit deployment only after owner-approved billing and cost controls, then complete end-to-end and accessibility acceptance.

For developer onboarding and exact local commands, see [SETUP.md](SETUP.md). For architecture boundaries, see [knowledge/ARCHITECTURE.md](knowledge/ARCHITECTURE.md) and the [current specification](planning/CURRENT_MVP_SPEC.md).
