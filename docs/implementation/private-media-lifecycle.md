# Private media lifecycle — local coding slice

Date: 2026-10-17
Scope: fail-closed FastAPI code only. This document describes local behavior and the remaining integration seam; it is not evidence of Cloud Storage configuration, provider retention, or deployed acceptance.

## Local contract

The standalone `private_media.router` provides:

| Method and path | Behavior |
| --- | --- |
| `POST /api/v1/private-media` | Authenticated, active-household upload of raw JPEG, PNG, or WebP bytes. Requires `Idempotency-Key`. Returns an opaque media ID and metadata only. |
| `GET /api/v1/private-media/{media_id}` | Reads metadata only for the same authenticated owner and household. It never returns an object name or signed URL. |
| `DELETE /api/v1/private-media/{media_id}` | Marks deletion pending, deletes the server-selected object, then records `DELETED`. A failed delete remains pending and can be retried. |

The upload accepts at most the lesser of the existing ordinary request limit and photo limit. The current ordinary request middleware limit is 256 KB. Content-Type must match the JPEG/PNG/WebP byte signature. There is no local disk or client-provided object path. The bucket must be named by the process variable `PRIVATE_MEDIA_BUCKET`; a configured Firebase/Google project identity must also exist and match the initialized Firebase app. Missing configuration or unavailable storage returns 503. Storage and Firestore errors do not expose provider details or paths.

Metadata lives under `households/{household_id}/private_media/{opaque_media_id}` and records owner UID, household ID, internal server-generated object name, content type, byte count, timestamps, 24-hour expiry, lifecycle state, and a payload fingerprint for retry conflict detection. The object name is not an API input or response. Access checks require current active membership plus exact owner UID and household match. A retry with the same owner, household, key, MIME type, and bytes returns the same metadata; reusing the key with different content returns 409.

Expiry is recorded as `expires_at = created_at + 24 hours`. A metadata read after expiry changes the visible state to `EXPIRED`, which makes clear the record is no longer current. This local slice does not install a Cloud Storage lifecycle rule or scheduled cleanup job, so expiry metadata alone does not prove object bytes were removed. Explicit DELETE attempts provider deletion and reports pending state on failure. A bucket lifecycle policy, retention configuration, IAM setup, deletion verification, and provider acceptance remain deployment/integration work.

## Integration seam

The router is registered in `backend/app/api/v1/router.py`. The browser does not call it: the existing bounded photo-candidate flow forwards image bytes transiently to Gemini and persists only candidate fields. Private Storage therefore remains an optional API capability, unavailable until a bucket and matching service identity are configured. The existing request middleware classifies only `/intakes/photo` as a photo-sized request; private media uploads are governed by its ordinary 256 KB request limit, matching this module's limit. No middleware change is required for this bounded slice.

The browser must send the raw image bytes, `Content-Type`, `Authorization`, `X-Household-ID`, and a stable `Idempotency-Key` to the canonical API. It must not choose or persist bucket paths. Browser Storage access remains denied by the current rules. No frontend wiring is part of this slice.

## Evidence and open risks

Allowed local evidence for this slice is Python compilation and `git diff --check`; no unit tests, provider calls, cloud calls, deployment, or billing actions are authorized. A successful compile proves syntax only. There is no evidence here that the bucket exists, is private, has suitable retention/IAM settings, or that provider deletion works.

Object creation and Firestore metadata creation cannot be atomic. The code tries best-effort object deletion if metadata creation fails; a process crash in that interval can leave an orphan object. If object deletion succeeds but the final metadata update fails, the record remains `DELETE_PENDING`; retrying DELETE reconciles the state. Expired media not read or explicitly deleted can remain in the bucket until a separately configured lifecycle policy removes it.
