# Firebase sign-in diagnostics — 17 October 2026

## Finding

The deployed `/account` page shows a generic Firebase sign-in failure. The account component only renders first-household onboarding or “Create another household” after Firebase auth reaches `signed-in`, so the signed-out page hides household creation by design. A read-only Auth/Firestore lookup confirmed the account has active membership records, but the deployed browser session has not authenticated successfully.

The frontend caught Firebase errors but mapped only selected codes; all other codes collapsed to “Firebase sign-in could not be completed.” The generic message did not prove an authorized-domain, provider, or API-key configuration issue. The current browser console had no captured error details.

## Local change

`frontend/src/components/account/account-connection.tsx` now gives specific guidance for common Firebase credential, provider, domain, popup, network, throttling, and app/API-key errors. Unknown Firebase errors remain generic but include only a strictly validated `namespace/code`; raw error messages, stacks, tokens, and credentials are never displayed.

Validation: targeted ESLint for `account-connection.tsx`, `npx tsc --noEmit`, and `git diff --check` passed. No unit tests, env-file reads, browser writes, cloud changes, or deployment were performed. The active Cloud Run revision still uses the earlier image, so these diagnostics will only appear after a later authorized frontend release.

## Follow-up

On the next authorized frontend release, retry sign-in and record the displayed Firebase code. Use that exact code to resolve the provider/configuration or browser-popup cause. Then verify membership discovery in the deployed browser and complete the household-create/readback acceptance only if needed.
