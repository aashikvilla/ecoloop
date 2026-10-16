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
