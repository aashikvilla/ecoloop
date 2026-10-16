# Account commands and private history — 16 October 2026

Scope: local integration preparation on `codex/demo-integration`, reviewed by root integrator. No paid services, live credentials, deployment, or frontend/backend unit tests. Browser commands default to unavailable via `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS=false`; changing this build flag is not authorization to enable live services.

## Implemented

- Kitchen confirmation and Shopping entry create/edit forms use explicit preview and confirmation, version checks, immutable pending payloads and stable retry keys. Ambiguous responses retain the exact command for an explicit retry; conflicts require a fresh read and review. Shopping saves do not imply purchases or stock intake.
- Owner-private sharing/activity reads validate bounded responses, states, quantity provenance, household and owner scope. No recipient contact, sharing mutation, total savings or impact claim is added. Reads are explicit, cancellable and bounded in memory.
- Shared transport restricts routes, methods and origin, omits cookies/redirects, bounds request and streamed response bytes and never retries commands automatically. Account/scope changes unmount private controls and cancel late responses; failed private reads clear loaded data.
- Backend clears known stock after unknown-quantity usage/discard/compost, preserves valid small positive remainders and rejects malformed persisted dates before sharing.

## Observed integration evidence

- Root TypeScript check passed after the shared transport refactor. Inline transport checks used synthetic fetch responses only: disabled writes never fetched; invalid routes, scope and origins were rejected; pagination encoded safely; response overflow was rejected; conflicts mapped to recovery; explicit opt-in command serialization was preserved.
- Frontend-generated Kitchen/Shopping command JSON passed the actual backend Pydantic models and transaction callbacks using an in-memory Firestore substitute. Repeated exact commands returned the saved results. Actual serialized backend results passed the frontend response parsers. A sub-micro quantity remained positive.
- Actual sharing lifecycle code produced an OFFERED → ACCEPTED → HANDED_OVER record and one activity event using the in-memory substitute. The first consumer check exposed `Z` versus `+00:00` timestamp representations; history validation was corrected to compare instants with fractional precision.
- Worker reports record type/lint, serializer/parser and fake-store boundary checks in [commands](../../implementation/canonical-commands.md), [history](../../implementation/private-history.md) and [stock hardening](../../implementation/stock-hardening.md). These are local observations, not live Firestore proof.

## Open acceptance gates

Final application checkpoint `f5c5683`: root default production build/TypeScript generated 14/14 pages; full lint and backend compile passed. Production browser at 360px and 1440px showed unavailable sign-in and disabled reads, even after keyboard household selection. Controls measured 48px high, sampled pages had no horizontal overflow, and collected browser errors were empty. Ask still rendered all five scripted cards with approvals disabled. [Mobile](account-mobile.jpg) and [desktop](account-desktop.jpg) screenshots were inspected; no enabled authenticated journey is claimed.

Live Firebase identity, membership revocation, browser CORS, real database contention/retries and indexes remain unverified. Enabled command journeys and private history with actual credentials have not run. Full cloud journey acceptance, media/privacy retention controls, real extraction and proposal approval, Gemini/ADK, managed Sessions/Memory Bank and deployment remain open. M0–M5 phases remain incomplete; PR #1 stays draft and main is unchanged.

No real environment files were read. The unrelated user PDF is preserved and excluded from commits.
