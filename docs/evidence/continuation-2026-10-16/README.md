# Second-wave local acceptance — 16 October 2026

Reviewer: root integrator, 2026-10-16. Application checkpoint: `f66b210`. Existing first-wave evidence remains in [demo acceptance](../demo-2026-10-16/README.md). These observations prove local code and sampled browser behavior; they do not prove live Firebase, Firestore transactions/indexes, Google OAuth, managed AI/context or deployment.

## Observed integrated checks

- Package-local TypeScript completed without diagnostics. Full frontend ESLint exited 0. Final production Turbopack build compiled, completed TypeScript and generated 14/14 pages, including `/account`.
- Backend `uv run --locked python -m compileall -q app` and `uv lock --check` succeeded. OpenAPI at `/api/v1/openapi.json` returned 200 and includes the explicit EXPIRED share transition.
- In-process HTTP requests for GET share logs, GET activity, POST share log and PATCH share log all returned 401 UNAUTHENTICATED without credentials. No Firebase verification/provider/database call was needed for these denials. Existing Starlette/httpx deprecation warning was observed.
- Both required owner-filtered timeline index declarations parse. They are not deployed. Document-ID ordering follows the final descending sort field.
- A cross-language contract smoke serialized all five card types through the Python backend schema and fed that JSON to the frontend validator. All five were accepted; replacing one discriminant with an unsupported type safely omitted only that card and retained the message.
- Production browser at `http://127.0.0.1:3002`: Settings linked to Account; the account page displayed configuration unavailable, distinct read-only labeling, and disabled Kitchen/Shop read buttons. No sign-in was attempted or credentials supplied.
- Final production Ask rendered all five simulated card types. All five canonical approval buttons were disabled and recovery/review links were present. No invalid-card fallback appeared for the corrected scripted producer.
- At 360px, Account and Ask measured document width 345; at 1440px, Ask measured 1425. No horizontal overflow in these samples. Screenshots were visually inspected. This is sampled responsive review, not a full accessibility audit.
- Keyboard activation saved a local dinner plan for two. The success message appeared, and the subsequent Tomato item screen retained its recorded 6 pieces. Canonical approval and actual consumption were not inferred.
- Collected production browser error logs were empty after the checked flows. No frontend/backend unit tests were created or run.

## Worker checks and review

Workers independently ran package checks before integration. The card worker's default build failed because its node_modules symlink was unsupported by Turbopack; its webpack build passed. The integrator's real dependency installation and default Turbopack build passed.

The backend worker observed lifecycle, owner isolation, retries, known/unknown stock provenance, timezone/expiry and terminal EXPIRED behavior using a fake Firestore adapter in process. These are local contract/security observations, not evidence that the real transaction SDK, indexes, IAM or deployed database behave correctly. Those live checks remain mandatory.

Independent review covered account token/origin handling, cancellation on identity/scope changes, share ownership/recipient privacy, transactional ordering and expiry/cursor behavior. Root corrected public-env access and request cancellation issues, and added scoped index declarations. A production browser run then caught a real producer/consumer mismatch: scripted cards advertised twelve actions while the schema cap is ten. Root changed them to per-card bounded choices, rebuilt and observed all five cards render.

## Screenshots and capture limits

- [Account at 360px](account-mobile.jpg)
- [Ask at 360px](ask-mobile.jpg)
- [Ask at 1440px](ask-desktop.jpg)

Full-page captures place sticky/fixed navigation at the current scroll offset. This capture artifact does not describe a fixed element's location in the live viewport. A keyboard attempt to scroll the page body for an extra viewport-only screenshot was unsupported; no additional screenshot is claimed.

## Open proof and implementation

Read-only account wiring still needs real project config, enabled Google sign-in, approved origins, identity/membership checks and live API/database proof. Canonical mutations and sharing/activity UI are not wired into the browser demo. Proposal approval/storage, real intake/extraction, media, retention/deletion and abuse controls remain incomplete. Managed Gemini/ADK/Sessions/Memory Bank and deployed whole-flow acceptance remain blocked by existing access/billing gates. Main is unchanged; PR #1 remains a draft. No paid service, provisioning, deployment or real household mutation occurred.
