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
