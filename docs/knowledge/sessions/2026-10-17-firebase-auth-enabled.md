# Firebase Authentication enabled — 17 October 2026

## Request and scope

Owner explicitly asked to enable Firebase Authentication for project `ecoloop-staging-20261015`, then approved use of the signed-in Google account as the OAuth support contact. No local environment files were read. No user account was created, no model was called, and no billing, API, database, index, or deployment setting was changed beyond Firebase Authentication.

## Verified Console changes

- Initialized Firebase Authentication in the Firebase Console.
- Enabled Email/Password and Google sign-in. Console displayed both providers as Enabled.
- Set the Google OAuth public-facing project name to EcoLoop and used the owner-approved support email.
- Confirmed existing authorized domains `localhost`, `ecoloop-staging-20261015.firebaseapp.com`, and `ecoloop-staging-20261015.web.app`; added `127.0.0.1` because the local browser uses that origin.
- The Firebase CLI `init auth` attempt could not complete: this checkout has no default Firebase project alias, and its interactive prompt was treated as non-interactive. The Console was used instead; the deployed settings were verified on the provider and domain pages.

## Remaining acceptance

The Firestore membership is keyed to UID `ecoloop-judge-demo`, but a matching Firebase Auth user has not been created and signed in. Therefore authenticated API reads and membership denial have not been verified. The next step is to provision that synthetic user through the documented seed helper with an owner-selected local password, then sign in and make a read-only API acceptance check. Share/activity indexes and other cloud gates remain open.

## Evidence

Firebase Console showed Email/Password and Google as enabled, and Authorized domains listed both `localhost` and `127.0.0.1`. Screenshots were displayed during the setup interaction. The only code changes in this checkpoint update the setup/status documentation and session journal.

Architecture pointer: [architecture](../ARCHITECTURE.md), [decisions](../DECISIONS.md), [setup](../../SETUP.md), and [status](../../STATUS.md).
