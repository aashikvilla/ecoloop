# Social impact Phase 0 foundation — 17 October 2026

Historical implementation journal. The initial Storage blocker and in-progress result below were resolved by [the live closure session](2026-10-17-phase0-live-closure.md); Phase 0 / G0 is now accepted with 8/8 live AC and scoped reviewer evidence.

## Request and scope

The owner authorized local implementation of Phase 0 in `ECOLOOP_IMPLEMENTATION_PHASES_AC_CONTRACTS_V1.md`, with Firebase connection if needed and a progress update. Read `AGENTS.md`, architecture, decisions, past mistakes, the latest session, current MVP contract and Phase 0 acceptance table. Worked on `feature/phase-0-foundation`. The user contract calls for no public feature launch and no unit tests.

## Implementation

- Added strict social-impact data contracts and the additive `ActorContext`; existing household `Principal` and household routes remain intact.
- Added organization create/list, offer draft/edit/publish, owner list, approved recipient search, sanitized offer reads and Firestore reservation transaction routes.
- Server resolves actor scope from the Firebase token plus household/org membership. Active organization membership, membership version and permission are rechecked for mutations; recipient approval is independent and cannot be self-granted.
- Offers are separate from private pantry facts. Publishing is explicit, public reads omit exact pickup fields and owner identifiers, and claim reservations require the exact offer unit and check version/balance atomically.
- Firestore/Storage client rules remain deny-all. Added composite indexes and Auth/Firestore/Storage emulator configuration. Added a non-unit-test acceptance runner that exercises AC0-01 through AC0-08 against local emulators.
- Added `ECOLOOP_DISABLE_DOTENV=true` to permit local acceptance with explicit emulator environment variables without loading the ignored local environment file.

## Initial local-only checkpoint (before live deployment authorization)

- Python `compileall` passed for application code and the acceptance runner. Importing `app.main` with the explicit env-file bypass generated OpenAPI for all new organization/offer routes. Firebase/index JSON parsing and `git diff --check` passed. The host lacked Java; a temporary Adoptium Temurin JRE 21 runtime was downloaded outside the repository and checksum-verified against Adoptium metadata. Auth, Firestore and Storage emulators were then started under `demo-ecoloop`, and the acceptance runner passed AC0-01 through AC0-08.
- Concurrent claims initially exposed occasional 503 responses instead of the contract's 409 conflict. The claim boundary now retries bounded transient Firestore failures and reconciles uncertain commits through the actor-bound idempotency record. Two consecutive full acceptance runs then passed with one 201 and one 409. The runner prints response bodies if that assertion fails again. No live Firebase data/configuration, Cloud Run, indexes, rules, IAM or billing were changed.
- No user-facing screens or public launch were added. No Gemini/Maps call, Cloud Storage object, approval workflow, receipt or impact mutation was added.
- At this checkpoint Phase 0 was only locally implemented; Cloud Run regression and reviewer evidence were still outstanding. This was superseded by the live project continuation below. Phase 0 remains incomplete until AC0-07 and reviewer evidence are closed.

## Progress tracking

The connected `MVPTasks` Sheet is the live status authority. Added a separate `P0.01` row for the Social Impact Phase 0 foundation and a P0 row in `MVPOverview`; existing household task statuses were left unchanged. P0.01 is `In progress`, Done is false, evidence points to the local implementation record, and the acceptance condition requires emulator AC0 checks plus the existing Cloud Run household regression. The overview reports 37 total tracked units, with the P0 phase contributing one in-progress unit and zero verified. Updated the evidence to record the emulator pass; Cloud Run regression and reviewer evidence remain outstanding.

## Architecture and lesson

Current pointers: [Phase 0 contract](../../planning/ECOLOOP_IMPLEMENTATION_PHASES_AC_CONTRACTS_V1.md), [implementation record](../../implementation/social-impact-phase0.md), [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md).

Lesson: check Firebase Emulator Suite host prerequisites before planning emulator acceptance. When Java is absent, a checksum-verified temporary JRE outside the repository can enable isolated acceptance without changing project configuration. Translate transient Firestore failures at the transaction boundary using bounded retries and idempotent reconciliation, then repeat concurrent acceptance. Keep Cloud Run gates separate from emulator evidence.

## Live project continuation — 17 October 2026

- The owner explicitly directed live project changes and Cloud Run deployment, with no further emulator use. Billing/project/region/runtime identity and cost controls were reviewed before writes. The linked billing account is open; the ₹2,000 project-wide budget is an alert, not a cap. Billing credits could not be verified. No IAM or billing changes were made.
- Deployed Firestore indexes; all nine reported `READY`. Live Firestore rules were read and remain deny-all. Built filtered backend context as Cloud Build `dd5aeb46-68dd-4e02-90b2-37bd26a6ba66`; revision `ecoloop-api-00026-rej` now receives 100% traffic. Previous 100% revision `ecoloop-api-00023-niy` remains the rollback target. Post-promotion health, unauthenticated household denial and CORS preflight returned 200/401/200.
- Live synthetic acceptance passed AC0-01–06 and AC0-08 against candidate Cloud Run and Firestore. Synthetic Firebase Auth accounts and Firestore documents were removed. AC0-07 remains open: the configured Storage bucket is absent, and the canonical bucket name could not be created due to domain ownership conflict. No bucket, Storage release or media object was created. G0 and Phase 0 remain incomplete pending AC0-07 and reviewer evidence.
- Updated the live MVPTasks Sheet snapshot text and evidence; P0.01 remains In Progress, Done is false, and reviewer/date fields remain blank. Updated STATUS, implementation evidence, architecture, decisions and this journal to match the deployed state.
