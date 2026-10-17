# Phase 0 live closure — 17 October 2026

## Request and bounded scope

The owner asked to resolve AC0-07 and finish Phase 0 in the existing live project, using no emulators. They also asked whether separate login screens could wait. Read the project agent contract, architecture, decisions, past mistakes, initial Phase 0 journal, acceptance contract and relevant Firebase/deployment skills. Continued on `feature/phase-0-foundation` with the pre-existing uncommitted implementation; no commit or push was requested.

## Fix and review

- The web app's configured bucket did not exist because the Firebase Storage API was disabled. General GCS creation of the default dotted name had returned a misleading domain ownership error. Enabled `firebasestorage.googleapis.com` and used Firebase `projects.defaultBucket.create` with `ASIA-SOUTH1`; the intended bucket was created successfully.
- Enforced uniform bucket access and public access prevention, then deployed deny-all `storage.rules`. Read back active ruleset `cd56ab11-5db5-4222-b48b-764c1611f67d`; it matched checked-in source (SHA256 `6f22aaf18dc9edd20961fafe7736ce9b28f8023e0626ac40d89d08a8922a4a6f`).
- The first live attempt uploaded a synthetic PNG but the project owner lacked object read permission under uniform access. Added only bucket-scoped `roles/storage.objectViewer` for the owner, verified readback and removed that exact image with a generation precondition. The first attempt's synthetic Auth/Firestore fixture was also removed. The API runtime received no new IAM role. The default seven-day GCS soft-delete setting remains.
- Independent two-pass review by Codex `phase0_review` found no critical access/transaction issue, but did catch mismatches between unused record schemas and persisted drafts/claims/events/membership timestamps. Aligned those schemas, initialized canonical claim collected/received quantities to zero, and extended live acceptance to validate every generated record and both pending/revoked claim denials. Re-review found no remaining G0 code blockers and approved conditional on matching deployed live acceptance.

## Deployment and proof

- Cloud Build `6a4c652f-c121-4dd6-b8df-1743cb757819` succeeded from a filtered 54-file backend context with no environment files. Image digest: `sha256:e54eabec73a8551b8e92e758828cd5595917475888b0c6b475e9795ddf6313ff`.
- Deployed Cloud Run `ecoloop-api-00028-gig` at zero traffic with tag `phase0-complete-20261017`; its runtime environment and service identity matched prior revision `ecoloop-api-00026-rej`. The guarded live runner exited zero: **AC0-01–AC0-08 passed** against Cloud Run, Firestore and Firebase Storage. Persisted organization/member/draft/populated offer/claim/event contracts validated. Synthetic run `d9e4cc7928`; offer `jyP3XVoDb0lVZeSl5Ku7`.
- AC0-07 used a real synthetic PNG with no Firebase download token: authorized operator byte readback succeeded (200); anonymous Firebase, unrelated signed-in Firebase and direct public GCS reads each returned 403. The image was generation-bound deleted and absence verified. Auth accounts and Firestore fixtures were cleaned up.
- Promoted revision `ecoloop-api-00028-gig` to 100% traffic. Post-promotion health, unauthenticated household request and frontend CORS returned 200/401/200. Rollback target: `ecoloop-api-00026-rej`.
- Reconfirmed the same linked billing account, only linked EcoLoop project and existing budgets. The all-services ₹2,000 budget is an alert; Gemini's separate cap reports configured. Credits remain unknown. No billing setting or model/Maps invocation was included. No frontend/backend unit tests were created or run; Python compilation/schema generation and `git diff --check` passed.

## Outcome and progress

Phase 0 / G0 is complete with 8/8 live AC, household regression, schema evidence and reviewer/date **Codex `phase0_review`, 2026-10-17**. Updated the live MVPTasks P0.01 row to Complete/Done, preserved its calculated verification formula, and recorded the reviewer, date and evidence. The overview reflects one verified P0 foundation unit. Existing household units retain their prior status.

There is one shared Firebase sign-in. Separate business/NGO entry screens and role-specific onboarding can remain on hold for Phases 1/2; no such screen is required for G0. Product uploads/finalization/retention, expiry/deadline offer eligibility, real handovers/receipts/impact and public launch remain later-phase acceptance.

## Knowledge pointers and lesson

[Implementation evidence and live runbook](../../implementation/social-impact-phase0.md); [Phase 0 contract](../../planning/ECOLOOP_IMPLEMENTATION_PHASES_AC_CONTRACTS_V1.md); [architecture](../ARCHITECTURE.md); [decisions](../DECISIONS.md).

Use the owning product's provisioning API for managed default resources; a lower-level API error may be a provisioning-path mismatch rather than a resource ownership blocker. Prove private access using both an authorized successful read of an existing object and unauthorized denial, then verify cleanup. Validate actual persisted snapshots against their schemas; generating OpenAPI alone does not establish that those schemas match stored records.
