# Past mistakes and prevention patterns

## 2026-10-17 — Prompt evaluations do not prove authorization

Observation: an Agents CLI prompt dataset can probe whether responses follow scope and consent instructions, but it does not establish authenticated membership checks, cross-household isolation, revocation propagation, strict schema validation, or canonical no-write behavior. Prevention: label such datasets synthetic and quality-only; retain separate deterministic boundary/integration acceptance, and do not treat LLM-judge scores as security evidence.

## 2026-10-17 — ADK in-memory session reads return copies

Observation: updating `Session.state` on a session returned by `InMemorySessionService.get_session` does not reliably persist authorization scope because the service returns a copy. Prevention: seed trusted scope when creating the session, recreate legacy sessions that lack it, and recheck current membership inside each household-scoped tool before reading data.

## 2026-10-17 — Activity summaries must identify their page scope

Observation: household history endpoints are paginated. A count or quantity from the first page can look like a complete household total if its coverage is not stated. Share offers also describe a different state from completed handovers.
Pattern: summarize only fetched records, label the loaded-page scope and expose continuation when another page exists. Keep offers separate from outcome events, and add quantities only when their recorded measurement basis and units support the same total.

## 2026-10-17 — Correction commands must preserve zero and unknown provenance

Observation: outcome recording can legitimately reduce a known balance to zero, while the fact-confirm input schema initially accepted only positive amounts. The same schema also allowed a date source when the date was unknown. Prevention: make correction schemas reflect every valid persisted state, and enforce unknown/date-source consistency at the API boundary as well as in UI builders.

## 2026-10-17 — Existing browser tabs can retain an old production page

Observation: after rebuilding and restarting the local Next production server, an already-open browser tab still displayed its prior scripted page, while a new tab on the same port loaded the API-only build. A later check also found separate local servers on ports 3002 and 3003, with the browser still on the scripted 3002 app and the integrated routes served from 3003. Prevention: verify the intended port and route after replacing or starting a server; do not use an old tab's DOM as proof that the current build loaded.

## 2026-10-17 — Running frontend processes keep inherited configuration

Observation: updating ignored `.env.local` did not replace `NEXT_PUBLIC_ECOLOOP_API_ORIGIN` already inherited by the running Next.js process; a second dev server in the same checkout also hit the single-instance lock. Prevention: inspect the process/compiled client, not just the env file; restart with the intended process environment or use an isolated checkout and port without stopping a user-owned server.

## 2026-10-17 — Cross-worktree dependency junctions can mutate the source checkout

Observation: pointing an isolated worktree's `node_modules` junction at the primary checkout let `npm ci` traverse into and attempt to remove source dependencies; Turbopack also rejected the external junction. Prevention: install from the lockfile inside the target worktree. Never run dependency-cleaning commands through a junction to another checkout.

## 2026-10-16 — Stale source directories keep returning through pointers

Observation: a superseded archive and consolidated reference pack remained in the checkout, and current instructions still linked to them. The entrypoint also pointed to an old session while later implementation records existed.
Pattern: remove superseded material from the active checkout when Git history is sufficient; repair incoming links first. Keep one short entrypoint, one dated implementation snapshot, the live task-status authority and a correct latest-session pointer.

## 2026-10-17 — Local provider credentials must not imply consent to call

Observation: loading a developer `.env` into backend settings can activate a configured paid model path even when the current task only needs local API work. Provider selection also treated an empty `SecretStr` as present, hiding the fallback key.
Pattern: keep provider calls behind a separate explicit opt-in; report selected provider and activation/runtime status without exposing credentials; treat blank secrets as absent. Health checks must not probe external providers.

## 2026-10-17 — Idempotent acceptance compares command results, not request envelopes

Observation: a correct retry returned the same persisted result under a new request ID, but the acceptance harness compared the full response envelope and failed. Prevention: compare the stable domain result for idempotency; treat per-request metadata such as trace/request IDs as intentionally different.

## 2026-10-16 — Validate the producer through the consumer

The shared card validator correctly rejected an action list longer than ten, but the scripted Ask producer emitted all twelve allowed action names for every card. Types, lint, builds and a valid backend wire fixture passed while every actual browser example disappeared. Use per-card allowed choices and verify the actual integrated producer in the production browser; a valid hand-authored fixture alone does not cover the product path.

The next integration pass found the same class of mismatch in sharing history: the backend serialized equivalent timestamps as `Z` and `+00:00`, while the client compared raw strings. Run the actual producer through the actual consumer; compare timestamp instants with fractional precision instead of their formatting.

## 2026-10-16 — Unknown outcomes invalidate known balances

An unknown-quantity stock-changing event retained the old known balance and advanced its observation time. Clear quantity/unit or require reconciliation whenever a safe decrement cannot be determined. Avoid arbitrary decimal rounding that erases otherwise valid small quantities, and validate persisted date types/value consistency before eligibility decisions; validated commands do not guarantee every stored record is valid.

## 2026-10-16 — Public configuration and identity changes are integration boundaries

Review caught public Firebase configuration read through a destructured environment object, which Next.js does not inline into browser bundles, and an authentication-error path that cleared the screen without cancelling an in-flight private read. Use literal `process.env.NEXT_PUBLIC_*` references; on account/scope/error changes cancel requests and clear both records and scope identifiers. An isolated worker typecheck cannot prove configuration delivery or private-data lifecycle; combine independent boundary review with production browser checks and later live identity proof.

## 2026-10-16 — Shared boundaries require integration proof

CSS reset rules outside cascade layers defeated token utilities; provider hydration across a streamed subtree changed its initial markup; dynamic route params failed production prerender outside Suspense. Keep resets/component defaults in appropriate layers, put state providers within the same hydration boundary as consumers, and check the production build plus actual browser interactions after feature merges. A worker build alone does not prove the integrated styled application. Use installed tools from the package directory, not root npx fallback packages.

## 2026-10-16 — Retry identity must describe the actual command

A retry key without payload/actor binding can hide a different action or expose another actor's result. Scope keys to authenticated actor and household, compare full payload fingerprints, and retain explicit outcome timestamps/version checks. Keep the same key available when a request has an unknown outcome: unmounting or aborting during sign-out or household changes does not prove the server did not commit. Demo share acceptance must never reduce stock; only an idempotent confirmed handover can record the outgoing quantity.

Photo retries bind their idempotency fingerprint to the original MIME type and image bytes. Do not fingerprint only model output: repeated extraction can vary even when the user's command is the same.

## 2026-10-15 — Scope reduction must reach active instructions
Newer consumer sources retained managed Sessions/Memory Bank and typed cards while older guidance prescribed operator workflows. Some archived benchmarks fabricated passes. Reconcile source precedence, archive stale packages together and update discovery descriptions. Simpler UI does not cancel explicit technical decisions; screenshots do not prove live integrations or impact.

## 2026-10-15 — Separate native function proof from renderer compatibility
A title merge crossing frozen columns caused an atomic Sheet batch rejection; retry used frozen rows only. Native formula checks passed, while local XLSX rendering does not support all Google formula/control behavior. Record those limits. Bundled skill validation could not import PyYAML; do not claim it ran.

## 2026-10-15 — Procedure examples promoted into facts
Observation: local examples contain default-tenant behavior and universal food/cooking constants unsupported by the cited original rule context. The application was not changed in this session.
Pattern: procedural guidance and snippets are not authoritative policy or authorization. Before reuse, verify the boundary, source applicability, owner and denial behavior. New design documents require fail-closed membership and reviewed policy bundles; implementation proof is future work.

## 2026-10-15 — Repeated research and multiple live status copies
Observation: 42 source files contain successive/overlapping proposals and repeated studies. Re-reading all of them per unit wastes context and can revive superseded choices.
Prevention: preserve dated source inventory, record explicit supersession/conflicts, load only the current unit's contract, and keep one live status authority. Google Sheet owns task status; local JSON/Markdown remain snapshots. No automatic sync is claimed.

## 2026-10-15 — Checkboxes without evidence
Prevention verified in native Sheets: completion checkbox plus status, evidence, reviewer/date and verified prerequisites are all required. Removing upstream evidence reopens dependent work. IDs must be unique and dependencies precede dependents. Use filters, not physical row sorting.

## 2026-10-16 — Reopening billing can affect other projects

Observation: the only available billing account is closed but remains associated with another active project. Reopening it to unblock the hackathon could resume charges beyond EcoLoop. Prevention: enumerate linked projects and review their owners/resources before reopening an account; use a dedicated active account scoped to the hackathon project or obtain explicit account-owner approval, then configure the project budget and additional cost controls before enabling paid services.
## 2026-10-17 — Validate the full provider request, then the actual provider

`process_schema` alone accepted an assistant schema that the full GenAI converter rejected on discriminator/union fields. A subsequent full converter check passed a raw JSON Schema which the provider rejected with HTTP 400. Verify local schema construction, full request conversion, actual provider acceptance and final strict response validation as distinct boundaries. Preserve strict local validation when changing provider generation hints; a conversion success is not model-response evidence.

## 2026-10-17 — Validate wrapped API responses at the client boundary

Candidate GET/confirm endpoints correctly returned the shared `ApiResult` envelope, but the first UI parser version expected the nested intake fields at the top level. An independent review caught that this would make every valid read/confirmation appear malformed before browser acceptance. Parse and validate the common envelope once, then pass only its result to route-specific schema parsers; verify the actual shared contract at integration.

## 2026-10-17 — Keep shared route status aligned with implemented flows

Manual capture and persisted candidate review were implemented, but the shared shell still classified `/kitchen/add` and `/kitchen/review` as unavailable. The page content worked while the header/sidebar said it did not. When a flow is added, update shared route-level availability labels and guidance alongside the page; include those shared states in browser review.

## 2026-10-17 — Keep local app port, CORS and launcher flags in sync

Observation: the browser used `localhost:3000`, but a stale production Next process served a build with household creation disabled while the local API only allowed CORS from ports 3002/3003. The page surfaced a disabled button and generic household-service error. Prevention: start the intended dev build from one launcher that sets its port and feature flags, include that exact origin in API CORS, verify a preflight for the browser origin, and have the owner manually reload before claiming browser acceptance.

## 2026-10-17 — Activity summaries must identify their page scope

Observation: household history endpoints are paginated. A count or quantity from the first page can look like a complete household total if its coverage is not stated. Share offers also describe a different state from completed handovers.
Pattern: summarize only fetched records, label the loaded-page scope and expose continuation when another page exists. Keep offers separate from outcome events, and add quantities only when their recorded measurement basis and units support the same total.
