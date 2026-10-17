# Deployed household creation fix — 17 October 2026

## Outcome

The user reported that a signed-in user could not see the household-creation option in the deployed app. The deployed UI had the create flow enabled, but signed-in membership discovery failed with `IDENTITY_UNAVAILABLE`.

## Root cause and correction

- The API calls Firebase Admin `verify_id_token(..., check_revoked=True)`. Firebase Admin's revocation/disabled-user check calls `get_user(uid)`.
- Cloud Run's `ecoloop-api-runtime` identity had `roles/datastore.user` but lacked `firebaseauth.users.get`; identity verification therefore returned HTTP 503 before the account could load memberships or expose onboarding.
- Created custom project role `ecoloopFirebaseAuthUserLookup` containing only `firebaseauth.users.get` and bound it to the API runtime service account. This keeps revoked-token checks enabled and avoids broad Firebase Auth Viewer/Admin access.
- No source code, Cloud Run environment variable, Gemini key, or service revision was changed for this fix. The role grant applied to the existing API service.

## Acceptance evidence

- Reloaded the deployed account route while signed in as the synthetic `judge-demo@ecoloop.example` account.
- The browser then loaded two existing memberships and visibly displayed “Create another household.”
- Opened the two-step setup, entered `EcoLoop Demo Home`, reviewed it, and submitted the explicit create action.
- The deployed page confirmed “Household created and selected for this tab,” owner role, and household ID `df315b081a18471197b70b074cf7735a`.
- This is live Auth/Firestore acceptance for membership discovery and household creation. It is not AI, media, Managed Sessions/Memory, or whole-product acceptance.
- Cloud Run traffic is 100% on the `rel-37179c60755d` revisions and API health is HTTP 200. The health response still reports assistant unavailable/disabled, unmanaged in-memory sessions, and no managed Memory Bank.

## Repository and deployment state

- Verified `origin` has only `main`; PR #1 and PR #2 are merged. The sole registered Git worktree is the primary checkout. Remaining local historical branches are not GitHub branches.
- The GitHub Actions main-branch Cloud Run deployment workflow remains configured. An IAM-only correction did not require a new image build/deploy.
- No real environment file was read. No credential or token was logged, changed, or committed. No unit tests were run.
