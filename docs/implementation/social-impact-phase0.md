# Social impact Phase 0 implementation record

Updated: 2026-10-17
Status: **Phase 0 / G0 complete**. Live AC0-01–AC0-08 and the existing household regression passed. Scoped reviewer: **Codex `phase0_review`, 2026-10-17**.

Authority: [Phase 0 contract](../planning/ECOLOOP_IMPLEMENTATION_PHASES_AC_CONTRACTS_V1.md), [architecture knowledge](../knowledge/ARCHITECTURE.md), and [decision register](../knowledge/DECISIONS.md).

## Implemented

- Added strict contracts for organization membership, actor scopes, offers, private offer media metadata, quantity ledgers, claims, pickup events, recovery needs/plans, and impact events.
- Added `X-Actor-Kind` and `X-Actor-Id` selection. FastAPI resolves them from the verified Firebase UID and current household or organization membership; transaction commands recheck membership version and permissions. The existing `X-Household-ID` dependencies remain intact.
- Added organization create/read, donor offer draft/edit/publish, owner offer reads, approved-recipient discovery, sanitized public offer detail, and claim reservation endpoints under `/api/v1`.
- Business and recipient organizations start `PENDING`. The creator receives only an organization membership; the service has no self-approval route. Recipient search/reservation and business publication require server-owned `APPROVED` status.
- Offer documents are separate from household pantry records. Publication requires donor declarations for an integer quantity/unit, expiry unknown or donor-declared, storage, allergens, pickup window, approximate area, exact address and coordinates.
- Public offer reads return approximate area and public attributes only. Exact address, instructions, coordinates and media IDs are returned only to the donor or an approved active claimant. Public views do not expose owner IDs or creator UIDs.
- Claim writes atomically recheck organization membership, offer version/status, unit equality, and available quantity, then update the ledger and create one claim, reservation event and idempotency result. Units are not converted implicitly; received quantity is a subset of collected quantity.
- The live Firestore rules were verified to deny all client access. The default Firebase Storage bucket is now provisioned in `ASIA-SOUTH1` with deny-all client rules, uniform bucket access and enforced public access prevention. The composite indexes for member, owner-offer, public-discovery and claim/event queries were deployed and reached `READY`.
- Aligned stored-record schemas with actual Firestore snapshots: organization membership timestamps; separate empty/edited draft contracts; populated offer ledgers; claim metadata and explicit zero collected/received quantities; reservation event offer IDs. Live acceptance validates every generated record before cleanup.
- The guarded live acceptance runner permits only the named project and its Cloud Run service/tagged hosts, requires `--allow-live-writes`, refuses emulator host settings, creates synthetic accounts/data only and performs targeted cleanup. Earlier emulator evidence is historical; the closure below used live services exclusively.

## Live deployment and Storage provisioning

- Project: `ecoloop-staging-20261015`; single environment; API, Firestore and Storage region: `asia-south1`.
- [Cloud Build `6a4c652f-c121-4dd6-b8df-1743cb757819`](https://console.cloud.google.com/cloud-build/builds;region=asia-south1/6a4c652f-c121-4dd6-b8df-1743cb757819?project=26177403871) succeeded from a filtered 54-file backend context with no environment files. Image digest: `sha256:e54eabec73a8551b8e92e758828cd5595917475888b0c6b475e9795ddf6313ff`.
- Cloud Run revision `ecoloop-api-00028-gig` was accepted through tag `phase0-complete-20261017`, then promoted to **100% traffic**. Runtime environment and service identity match the prior serving revision. Rollback target: `ecoloop-api-00026-rej`.
- Post-promotion service checks: health **200**, unauthenticated household request **401**, frontend CORS preflight **200**.
- Enabled `firebasestorage.googleapis.com` and provisioned `ecoloop-staging-20261015.firebasestorage.app` using [Firebase's default-bucket creation API](https://firebase.google.com/docs/reference/rest/storage/rest/v1alpha/projects.defaultBucket/create), with `location=ASIA-SOUTH1` and Standard storage. The earlier general GCS API domain error did not prove another owner held the intended bucket.
- Deployed `storage.rules` as deny-all. Readback matched checked-in source; SHA256 `6f22aaf18dc9edd20961fafe7736ce9b28f8023e0626ac40d89d08a8922a4a6f`. Active ruleset: `cd56ab11-5db5-4222-b48b-764c1611f67d`; release: `firebase.storage/ecoloop-staging-20261015.firebasestorage.app`.
- Bucket IAM has no public principal. Uniform bucket access and public access prevention are enforced. Added bucket-scoped `roles/storage.objectViewer` for the project owner `aashikvilla99@gmail.com` to permit administrative readback; no new runtime identity role was granted. The first acceptance attempt's temporary image was explicitly removed after resolving this read permission.
- Billing preflight reconfirmed the linked open billing account and its only linked project, EcoLoop; the all-services ₹2,000 monthly budget is an alert, and the separate Gemini cap reports configured. Credits remain unknown. No billing settings changed; no model/Maps call was made. Cloud Run retains one maximum instance and zero minimum instances. Default seven-day GCS soft deletion remains; media upload/retention product behavior is Phase 1 scope.

## Acceptance evidence — 2026-10-17

Runner: `backend/scripts/phase0_live_acceptance.py`; exit **0**. Synthetic run **`d9e4cc7928`**, offer **`jyP3XVoDb0lVZeSl5Ku7`**; reservation **`claim_3d69b848300f0d6ebec28f066b58ef27f6b61bccfa54f09516282492c2fcca88`**. These records were removed after verification.

| AC | Live observation | Result |
|---|---|---|
| AC0-01 | Synthetic household create, membership discovery and authenticated Kitchen read succeeded against Cloud Run | Pass |
| AC0-02 | Foreign business selection/publication/private reads and unrelated household access denied | Pass |
| AC0-03 | Pending and revoked recipient discovery **and claims** denied with 403 | Pass |
| AC0-04 | Concurrent requests for 7 of 10 packages yielded one 201 and one 409; reserved 7, available 3 | Pass |
| AC0-05 | Exact retry returned the same claim; only one reservation event existed | Pass |
| AC0-06 | Discovery omitted exact address, pickup instructions, media IDs and donor UID | Pass |
| AC0-07 | Real synthetic PNG uploaded and read by authorized operator (200); anonymous Firebase, unrelated Firebase user and direct GCS access each returned **403** | Pass |
| AC0-08 | A portion claim against a package offer was rejected; no implicit unit conversion | Pass |

Persisted organization, membership, initial/edited draft, published/reserved offer, claim and event snapshots passed their strict Pydantic contracts. Administrative image readback checked bytes and absence of Firebase download tokens before the negative access requests. Image deletion used a generation precondition and absence was verified. Synthetic Auth accounts and Firestore records were removed. No customer records were used.

Two-pass reviewer: **Codex `phase0_review`, 2026-10-17**. Initial persisted-schema and pending/revoked-claim evidence findings were resolved. Re-review found no remaining G0 code blockers and approved the foundation conditional on the successful matching live run, now satisfied. Python compilation/schema generation and `git diff --check` passed. No frontend/backend unit tests were created or run.

## Run the bounded live acceptance again

From `backend/`, use the authorized operator's ADC identity and the public Firebase Web app key obtained from app configuration. Do not load a real environment file. The command writes only its synthetic fixture and then cleans it up.

```powershell
$env:ECOLOOP_DISABLE_DOTENV = 'true'
$env:GOOGLE_CLOUD_QUOTA_PROJECT = 'ecoloop-staging-20261015'
$env:ECOLOOP_PHASE0_WEB_API_KEY = '<public Firebase Web app key>'
.venv/Scripts/python.exe -m scripts.phase0_live_acceptance --project ecoloop-staging-20261015 --api-origin https://ecoloop-api-4wlelpcnca-el.a.run.app --allow-live-writes
```

## Scope after G0

The shared Firebase sign-in remains sufficient for Phase 0; separate business/NGO entry screens and role-specific onboarding can wait for Phases 1/2. G0 acceptance does not release donor/recipient UI, an end-user media upload/finalize/retention pipeline, automated organization approval, map/route integration, Gemini extraction, expiry/deadline eligibility handling, pickup/receipt/impact mutations or a public feature launch.
