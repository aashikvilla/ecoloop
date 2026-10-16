# Demo execution — 16 October 2026

User authorized implementation, parallel GPT-6 Luna/high agents, separate branches, frequent commits and pushes. Billing remains deferred. All cloud AI/session/memory and deployment claims remain unverified until actual service proof. No frontend/backend unit tests.

## First wave and ownership

- [x] `codex/demo-foundation`: shared tokens/UI/layout; Home; Activity; Settings. Own globals.css, layout.tsx, page.tsx, components/ui, components/layout, app/activity, app/settings, public artwork. Wrap all routes in DemoProvider and shared AppShell.
- [x] `codex/demo-journeys`: Kitchen, capture, review, item action, sharing, Ask (including buying context), Shop. Own app/kitchen, app/ask, app/shop, components/features. Never edit globals/layout/shared UI/provider/contracts.
- [x] `codex/demo-backend`: backend schemas, verified identity, scoped repository/commands, API, Firestore schema/rules/index groundwork. Own backend and firestore.rules/firestore.indexes.json/storage.rules plus docs/implementation/backend-foundation.md.
- [x] `codex/demo-integration`: shared TS contracts/demo store, orchestration, live plan, cross-feature integration and acceptance evidence. Integrator owns this document and docs/knowledge.

Each branch starts at the same checkpoint. Agents commit and push their own branch, never rebase/merge main or each other. Integrator merges branches one at a time. Agent reports include commit SHA, touched files, observed checks and remaining gaps. Do not stage unknown files or real env/credential material.

## Frozen frontend seams

`src/lib/contracts.ts` defines FoodItem/FoodDraft, ShoppingItem, ActivityEvent, MealPlan and enums. `src/lib/demo-store.tsx` exports DemoProvider/useDemo. Read its typed interface before coding. UI state is explicitly synthetic and isolated in browser storage. It is not a cloud persistence, AI extraction or managed memory substitute. No authenticated household data enters it.

UI primitives from foundation: Button (native button props, variant primary/secondary/ghost/danger, size sm/md/lg, fullWidth optional), Card (native div props), Heading (as h1/h2/h3 optional), Input (native input props), Badge (children, className, tone optional), Icon (name string, size number optional, className optional). Feature agent may use native HTML with semantic token classes while awaiting these components. Coordinate API adjustments by messaging the integrator.

Routes: /, /kitchen, /kitchen/add, /kitchen/review, /kitchen/items/[id], /kitchen/items/[id]/share, /ask, /shop, /activity, /settings. Home links to add, item detail, Ask, Activity and Settings. Four primary nav destinations only. Capture manual entry works; photo parsing clearly reports cloud unavailable and offers manual fallback. Ask uses explicitly labeled scripted demo suggestions and never calls them Gemini responses. Saved demo preferences must not be labeled managed memory.

Use the actual PNG/HTML Stitch pairs plus current spec/audit corrections. Preserve source exports. Food illustration/photo assets may be controlled local SVG artwork; no fabricated safety/freshness/carbon/price/connected-service claims.

## Checkpoints

- [x] Preserve pre-implementation documentation in a pushed checkpoint.
- [x] Establish stable types and isolated demo store before feature branches.
- [x] Merge foundation and journeys; resolve interface issues centrally.
- [x] Review backend identity, scope, atomicity and unavailable-provider behavior.
- [x] Run authorized build/lint/type checks and browser journeys at 360px and desktop; no unit tests.
- [x] Commit/push integrated code and update live harness with evidence; cloud gates remain open.
- [x] Persist continuation instructions so a future scheduled pass can resume safely after usage reset.

These boxes describe local demo checkpoints only. Full M0–M5 gates remain governed by the live Sheet and their original acceptance criteria. [Observed evidence](../evidence/demo-2026-10-16/README.md) records production build, lint and sampled browser journeys. Backend live-service proof is still open.

## Pushed checkpoints and next lanes

| Lane | Remote checkpoint | State |
|---|---|---|
| Foundation | `abb661e` | Integrated; accessibility/copy follow-up included |
| Household journeys | `59da196` | Integrated; confirmations/loading/shared Input refinements included |
| Backend schema/security | `bf73c6d` | Integrated; container packaging prepared; live Firebase/image proof pending |
| Managed agent and cloud | Not started | Blocked by deferred billing; no paid work |
| Acceptance and release | `codex/demo-integration` | Local evidence recorded; deployed acceptance pending |

Five lanes are prepared; the platform permits four simultaneous agents including the integrator, so launch at most three workers at once. Never let two agents own the same shared file. Use GPT-6 Luna/high workers as requested. Single integrator resolves shared contracts and merges sequentially. Main remains unchanged until actual phase prerequisites, evidence and exit review permit a merge. Push checkpoints before handoffs and never stage the unrelated user PDF.

Hourly continuation is configured in the current chat. Resume only unfinished authorized work after checking limits/current branches; do not duplicate running work or repeatedly retry a billing blocker. A scheduled run needs the desktop app and computer available. It cannot create credits or enable billing.

Draft review: [PR #1](https://github.com/aashikvilla/ecoloop/pull/1). No reset credit was consumed. Deployment packaging is prepared, but Docker Desktop's Linux engine was unavailable, so no image build is claimed.

Final integration application checkpoint `1be5345`: production build/TypeScript and full-src lint passed again. Browser confirmed loaded item form units, discard cancellation without stock change, reset focus return and final Home render with no collected page errors.

## Second wave — authorized local implementation continuation

16 October: owner asked to continue remaining work with GPT-6 Luna/high workers. Previous coordinator is idle. This chat is the active integrator on `codex/demo-integration`. This authorizes local implementation preparation; no paid calls, provisioning or deployment, and no full phase gate closes without its original proof.

- [x] `codex/typed-assistant-cards` (foundation worktree): five backend-aligned validated card types, safe malformed-card fallback and scripted Ask renderers. Pushed `d7bc8db`, integrated. Provider approval remains unavailable.
- [x] `codex/canonical-share-activity` (backend worktree): owner-private share lifecycle, including terminal EXPIRED, and bounded activity API. Pushed `382c6dc` + `00ce66c`, integrated. In-process guards/lifecycle observed; live database proof remains open.
- [x] `codex/firebase-browser-boundary` (journeys worktree): separate read-only account/sign-in and Kitchen/Shop API client, unavailable without public config. Pushed `ffaf4e9`, integrated. Live sign-in/API connectivity remains unverified.
- [x] Integrator: shared navigation link, independent seam/security review, production type/lint/build and bounded browser/API acceptance, pushed checkpoints and progress handoff. Application checkpoint `f66b210`; [observed second-wave evidence](../evidence/continuation-2026-10-16/README.md). Cloud gates remain open.

Existing synthetic journeys remain usable while real services are unconfigured. Workers must report exact commits, observed checks and unverified boundaries; root integrates one branch at a time. Keep three worker slots maximum and preserve the unrelated user PDF.

The hourly continuation now targets the current coordination chat (`01a142d3-49d5-7403-85fa-97d96b3a51c1`). Read the latest session/evidence before starting another batch; avoid relaunching these completed lanes. Remaining work includes canonical mutation UI, real intake/extraction and proposal approvals, private media and retention/deletion/abuse controls, managed ADK/Sessions/Memory Bank, live identity/database/index proof, and reviewed deployment/whole-journey acceptance. Access/billing blockers remain unchanged.

## Third wave — local account commands and private history

Heartbeat at 19:04 IST found the prior three workers finished, the earlier coordinator idle, no PR feedback/checks, and ordinary usage available (59% five-hour / 28% weekly consumed). Reuse the same Luna/high workers; no reset credits or paid services.

- `codex/canonical-command-controls` (journeys): manual confirmed-fact and shopping command drafts, explicit preview/confirmation, version conflicts and stable retry keys. Own canonical-commands.ts, account/command-controls.tsx and its implementation note.
- `codex/private-history-ui` (foundation): strict owner-private share/activity response parsing and explicit paginated read controls. Own canonical-history.ts, account/private-history.tsx and its implementation note.
- `codex/canonical-stock-hardening` (backend): independent review identified unknown-amount stock reconciliation, sub-micro remainder rounding and malformed stored date eligibility. Own repository.py, sharing_activity.py and focused evidence note.
- Integrator: shared bounded transport (`88cf265` pushed), account wiring, default-off browser command flag, sequential review/integration, authorized package/contract/browser acceptance and evidence.
- Managed cloud lane remains prepared but blocked by unchanged deferred billing. Full deployment/whole-product acceptance remains open. No main merge is eligible from this local batch.

Transport allowlists routes/methods and trusted origin, bounds streamed responses, omits cookies and redirects, cancels requests and never retries writes. Commands stay disabled in the default build until live identity/database acceptance and approval to enable them. Existing demo state remains isolated; no media, proposals, outcomes or share writes are added by these UI workers.

Third wave completed: commands `4f2a32a`, history `980d7fc`, stock hardening `fa64c64`; integrated application `f5c5683`, evidence/handoff `b22d067`. Root production build/type/lint and offline cross-language boundaries passed; browser sampled unavailable states at 360px/1440px. Full authenticated acceptance remains open. See [evidence](../evidence/account-commands-2026-10-16/README.md).

## Fourth wave — observed outcomes and private sharing controls

17:35 UTC continuation found ordinary usage reset (1% five-hour / 34% weekly used), all prior workers completed, no PR reviews/checks, and preserved unrelated sign-in/config/skill changes. The separate chat “Review implementation document” owns `codex/docs-cleanup` and `codex/real-household-agent`; no takeover or merge without explicit handoff/evidence. Its newer cloud work is separate from this chat’s local-only authorization.

Plan: freeze transport/schema seams → implement two independent components → independent critical review → integrate sequentially → run bounded contract/package/browser acceptance → push evidence/live status and handoff. No main merge or paid/cloud actions.

- `codex/canonical-outcome-controls` (journeys): new canonical-outcomes.ts, account/outcome-controls.tsx and implementation note; actual USED/STORED/DISCARDED/COMPOSTED commands only.
- `codex/canonical-share-controls` (foundation): new canonical-sharing.ts, account/share-controls.tsx and implementation note; owner-reported offer/accept/cancel/expire/handover only, no recipient contact.
- Existing backend worker: read-only cross-boundary critical review, no implementation overlap.
- Integrator: shared safe PATCH transport `fc3889b`, own account composition hunk only, bounded proof/status. Preserve unrelated dirty sign-in changes unstaged.
- Managed/cloud lane remains owned by the separate chat. Media/retention and full release acceptance remain prepared unfinished lanes.

Fourth-wave closeout — 17 October: the outcome-control branch was merged at `22b2548` and the owner-private sharing-control branch at `3760159`; no feature branch cherry-pick is pending. A sequential critical review found the backend version/idempotency and owner-scope contracts consistent. `AccountConnection` now mounts both controls inside its existing user/household keyed boundary, alongside full paginated private history. The controls use the same default-off write flag; they send no requests while disabled. The short 25-record sharing list is labeled for lifecycle actions and points to full paginated history below. No live identity, authenticated API read, or mutation was exercised. TypeScript, ESLint and the production build passed; browser inspection on the current production server showed API-only Ask and signed-out Account states. The old `3002` browser tab had retained the previous production page in memory; opening a new tab on the refreshed server showed the current build.

No `main` merge is eligible. Live account identity and indexed share/activity acceptance, canonical capture/intake and item detail, proposal approval, managed preferences/Sessions/Memory Bank, and reviewed deployment/whole-journey acceptance remain open. No cloud actions, billing changes, model calls or unit tests were run.

## Fifth wave — minimal household onboarding and live database acceptance

17 October: the owner explicitly authorized synthetic test account creation, household creation, authenticated database reads, and one bounded AI interaction. The test account is `judge-demo@ecoloop.example` (UID `ecoloop-judge-demo`); its password is intentionally excluded from Git. Root owns frontend integration, evidence and this plan. Household creation route work remains owned by `codex/household-create-api`; onboarding UI work remains owned by `codex/household-onboarding-ui`. Those reviewed commits were integrated sequentially on `codex/demo-integration`.

- [x] Account UI supports minimal “Just me” onboarding through the authenticated idempotent household-create API and exposes sign-out.
- [x] Browser sign-in, existing household Kitchen read, empty Shopping read, wrong-household 403, created household 201/readback and sign-out were observed against the named Firebase project. Created synthetic household: `EcoLoop Test Kitchen`, ID `d8e5ef4cb23b4925a383ae1ae29792c5`. Evidence: [live onboarding acceptance](../evidence/onboarding-live-acceptance-2026-10-17/README.md).
- [ ] One synthetic Ask attempt did not reach Gemini: ADK rejected the numeric `Literal` while transforming output schema, before the provider request. Browser displayed a timeout. Assistant-enabled local backend was stopped. Fix belongs to the separately owned `codex/real-household-agent` agent module; do not edit/merge that branch without handoff and review.
- [ ] Share/activity indexes remain undeployed; authenticated private-history acceptance is open. Browser mutation flag remains false.
- [ ] M0–M5 phase exits remain gated by original prerequisites and reviewer evidence. This wave is local/API acceptance evidence only; no `main` merge eligibility is implied.

Ordinary usage remained available (59% five-hour, 43% weekly consumed); no reset credit was consumed. No unit tests were run. No cloud deployment, billing change or index write was made. The frontend dev server remains available at `http://127.0.0.1:3003`; the local assistant backend on port 8001 was stopped after the schema-conversion failure.

## Sixth wave — AI repair, feature audit and Cloud Run preparation

17 October: latest direct user request authorizes checking/fixing the AI, reviewing remaining features with GPT-6 Luna/high workers, and beginning Cloud Run deployment preparation. Three isolated workers completed the AI schema work, agent/GenUI feature audit and read-only cloud/deployment preparation; root integrated reviewed commits sequentially and pushed bounded checkpoints. The separately owned historical agent/docs branches were not modified or merged.

- AI: final fix `5767efa` uses JSON MIME mode and trusted schema instructions, retaining strict server card validation. After earlier local conversion errors and a provider HTTP 400, the final signed-in synthetic Ask request returned HTTP 200 and rendered one real MealSuggestion card. No stock change or approval occurred. See [AI evidence](../evidence/ai-schema-fix-2026-10-17/README.md). Managed runtime/tools/Sessions/Memory Bank remain open.
- Frontend: assistant timeout now allows the server's maximum model budget plus overhead. Ask conversation/session/card state remounts on auth/UID/household changes and aborts outstanding browser requests, independently reviewed. TypeScript and lint passed; no unit tests.
- Feature audit: [report](../implementation/feature-genui-audit-2026-10-17.md) distinguishes coding workers from the single product agent, five fixed typed cards from complete interactive GenUI, and implemented account commands from unverified write acceptance. The five next lanes are intake/confirmation, agent/tools, managed sessions/preferences, proposal approval/actions, and deployment/whole-flow acceptance; at most three workers plus root.
- Deployment: [reviewed helper](../../deploy/cloud-run.ps1) prepares private, tagged candidate revisions and explicit promotion/rollback. Provider calls stay disabled. APIs/runtime identity/image build and verified billing/cost gates are outstanding; no cloud changes or deployment performed.

Current checkpoint/evidence and precise continuation are in [the session journal](../knowledge/sessions/2026-10-17-ai-cloud-run-review.md). PR #1 remains draft; no main merge or full phase closure is eligible.

## Seventh wave — scoped assistant context and manual/text candidate intake

17 October: the owner asked to continue the next implementation step in parallel after reconciling all worktrees. Before this wave, all 13 registered worktrees were clean; `git cherry` showed no patch unique to a worktree relative to `codex/demo-integration`. The changes are present on the integration branch; `main` remains behind because phase prerequisites and exits are open. Three GPT-6 Luna/high workers used isolated worktrees and pushed separate branches. Root reviewed and integrated sequentially.

- [x] `codex/selected-context-tools` (`13b2bbc`): explicitly selected kitchen IDs are fetched directly beneath the verified household, up to the context cap, in request order. Missing IDs are omitted; empty selection retains the newest bounded context. Integrated at `0883106`.
- [x] `codex/manual-intake-api` (`3eedf65`, `dd8051d`): strict bounded candidate schema and authenticated `/api/v1/intakes` create/read operations. Firestore records are household-nested and creator-scoped; transactions recheck membership and bind retries to UID plus payload. Candidate writes do not touch `food_observations`; this endpoint does not call Gemini. Independent critical review found no concrete scope/idempotency/stock-mutation finding. Integrated at `8bb669f`.
- [x] `codex/manual-intake-ui` (`497e455`, `56c3dcd`, `95a3e8d`): manual entry and one-name-per-line text capture produce explicitly unconfirmed candidate cards; amounts/dates/storage can stay unknown, 0 means unknown, the input caps at 10, cancellation preserves the same retry key, and UID/household changes remount and cancel in-flight state. The existing browser write flag remains off. Integrated at `327af6b`.
- [x] Integrated verification: ESLint and TypeScript passed; Python compilation, strict JSON ISO-date parsing and `git diff --check` passed. No unit tests, live intake writes, index deployment, cloud provisioning or deployment were performed. The PR branch was pushed; no phase status was advanced.

At the time of this checkpoint, next was candidate review/edit and explicit confirmation. The eighth wave below completes that local code slice and supersedes the route-availability statement. Photo extraction, live confirmation acceptance, M2 prerequisites, item details, preference controls, proposal persistence/approval, managed Sessions/Memory Bank, indexed history, Cloud Run prerequisites and deployed whole-flow evidence remain incomplete. Browser writes remain default-off; no `main` merge is eligible.

## Eighth wave — persisted candidate review and explicit confirmation

17 October: the next M2 intake slice was split across two isolated GPT-6 Luna/high workers and reviewed before sequential integration. Root retained integration ownership. A later synthetic live acceptance used only the named test household; no model calls, billing changes, index deployment, provisioning or Cloud Run deployment occurred.

- [x] `codex/intake-confirmation-api` (`824624f`, idempotency fix `171e9e5`): adds authenticated owner-only `POST /api/v1/intakes/{intake_id}/confirm`. The transaction binds retries to actor, payload and intake ID; checks membership, creator, version, pending candidate IDs and absent canonical item IDs before writes; writes selected canonical observations, leaves unselected candidates pending, increments the intake version, and marks it confirmed only when none remain. Candidate IDs become stable canonical item IDs. Existing create-intake idempotency remains unchanged. Independent critical review found and fixed a cross-intake retry-key replay issue; the follow-up review found no concrete remaining issue. Live replay-after-success, concurrent/stale-version conflict and contention behavior remain unverified.
- [x] `codex/intake-confirmation-ui` (`bf48485`, partial result fix `8123384`, envelope/success fix `4c22aea`, integrated lint fix `f40da8b`): loads the creator-scoped intake, edits names/amounts/dates/storage, selects a subset, requires explicit confirmation, and preserves the exact command/key after an ambiguous response. Auth/household/intake changes remount and abort private requests. The UI parses the `ApiResult` envelope and reports partial/full completion honestly. Confirmation uses the existing false-by-default write flag. Independent critical review found and fixed the envelope-parser mismatch; review of the final scope/retry/gating changes found no concrete remaining issue.
- [x] Integration at `50ce49b`, `29246c1`, `69a6e8e`; production build generated 14/14 pages; TypeScript, ESLint, backend Python compilation and `git diff --check` passed. No unit tests ran. Detailed local evidence: [candidate confirmation](../evidence/intake-confirmation-2026-10-17/README.md).
- [x] Bounded synthetic live acceptance: authenticated `POST /intakes` returned 201; scoped GET returned 200; the UI corrected “E2E test spinach”, confirmed it alone (200), left rice pending at intake version 2, then confirmed rice (200). Kitchen readback returned both unknown-amount facts. A narrow Firestore read found one confirmed intake at version 3, zero candidates and exactly two unique canonical items. The same idempotency key was retained across an initial preflight failure; Firestore was read as empty before retry and the successful retry created one intake. This does not cover replay after an ambiguous successful write or concurrent stale-version conflicts.
- [x] Local browser integration fix: CORS originally rejected port 3003 because the API default only listed 3000/3002. Acceptance used a one-process allowlist for `http://127.0.0.1:3003`; no env file was inspected or edited. The shared shell also mislabeled `/kitchen/add` and `/kitchen/review` unavailable; root corrected the label and guidance copy.
- [ ] Additional live acceptance remains open for replay after success, concurrent/stale-version conflicts and duplicate prevention under competing requests. Browser writes remain disabled by default outside an explicitly scoped local session.

M2 is still open: M2.01.02 structured photo extraction is not implemented and M1.02.03 is not verified. Next implementation lane: photo extraction with strict candidate schema, bounded image inputs, prompt-injection handling and manual fallback, without a provider call until cost/billing scope is authorized. In parallel, item details, proposal persistence/approval, managed preferences/Sessions/Memory Bank, share/activity index deployment and whole-flow evidence remain open. `main` is not eligible for merge; billing/cost review and Cloud Run deployment gates remain blocked/unverified.
