# Screen-journey follow-up — 17 October 2026

## Scope

The owner asked to make the local household experience more complete and compare its screens with supplied Stitch designs. We used three isolated GPT-6 Luna/high workers for PWA/reminder readiness, the confirmed-photo-intake continuation into Ask, and explicit meal-plan-to-outcome linkage. Their branches were reviewed and sequentially merged into `codex/demo-integration`. Root added narrow navigation/auth-state polish.

## Implemented

- `df972ea` (`codex/pwa-reminders`): PWA manifest/icons, Settings install affordance, accurate unavailable state for push/email delivery, and mobile navigation at widths below 768px. No offline service worker, browser storage, FCM token, or notification permission was added.
- `fdb0709` (`codex/photo-to-assistant`): confirmed candidate completion offers recipe and BuyCheck Ask intents. The URL carries only fixed intent enums; Ask pre-fills an editable question and still requires an explicit send with signed-in household scope. No candidate or image content is forwarded.
- `712c495` (`codex/plan-outcome-link`): saved Home plans open an explicit actual-outcome flow, linked to a canonical Kitchen record or an item selector. The backend validates the plan ID against the active household transaction and retains it as provenance on the outcome/Activity event. Save or approval never implies preparation/consumption and never changes stock.
- Root polish: Home quick actions for capture, Shop, and saved meal plans; shorter shared household status with an Account link instead of repeating the household-ID form across every data destination; and a 12-second recoverable Firebase auth initialization error that can still recover on a later auth callback. Plan titles were removed from the outcome query string.

## Stitch comparison

The four-tab shell, warm light palette, shared cards/controls, Kitchen list, Ask card flow, capture/review, Activity, Settings, and household account are represented in the application. The supplied Home reference favors a dinner hero and prominent scan/shop/meal-plan shortcuts; Home remains data-first and intentionally avoids seeded usage metrics, invented food-safety assertions, or fabricated sustainability savings. Root added the shortcut row. Settings provides truthful reminder/install readiness; the browser cannot promise delivery without FCM and a backend scheduler.

The review was static against local Stitch PNG/HTML and source. Browser inspection showed route gates at signed-out Home and signed-in-without-household Activity, but did not establish pixel-level comparison, signed-in household journey, screen-reader acceptance, or 360px/desktop screenshot acceptance. Full visual acceptance remains open.

## Verification and evidence

- Integrated-source `npm run lint`: passed.
- Integrated-source `npx tsc --noEmit`: passed after TypeScript identified and root corrected a Next manifest type error by splitting `any` and `maskable` icon entries.
- Backend `uv run --frozen python -m compileall -q app`: passed.
- `git diff --check`: passed.
- No unit tests ran. Production build was skipped because Next build may load ignored real env files, which were prohibited from inspection in this pass. PWA agent lint and `git diff --check` passed; its isolated typecheck/build was blocked by an incomplete dependency installation. The integrated root typecheck closes the compiler check for its merged source.
- Read-only browser inspection of `http://127.0.0.1:3000/` showed the signed-out auth gate. `/activity` showed the household-selection gate when signed in without an active selected household. No browser mutation, model call, or database write ran.
- Final integration checkpoint `f6e5f9d` was pushed to `origin/codex/demo-integration`. The only registered worktree is now the root integration checkout; feature branches remain as recovery refs and are fully reachable from the integration branch.

## Remaining

- Duplicate-candidate reconciliation is absent. The product contract needs explicit matching and versioned add/replace/new-batch/skip choices; do not silently replace canonical food records.
- Photo candidates are transient. Private media upload/finalize, retention, and a deployed cleanup lifecycle remain separate prerequisites.
- PWA install prompt needs HTTPS/browser-device acceptance. Push/email delivery has no FCM subscription or scheduler.
- Managed ADK Runtime, Sessions, and Memory Bank remain code/configuration-only or absent and have no actual service proof.
- The Activity page does not create a composite sustainability score. No agreed metric, data coverage, or uncertainty policy justifies one; continue reporting only recorded events and compatible measured amounts.
- No Swiggy/Zomato integration or recipient network exists; those integrations require partner and product authorization and are out of household MVP scope.
- Authenticated browser command acceptance, photo-provider acceptance, full screen walkthrough, release exit reviews, Cloud Run/App Hosting, and live MVPTasks reconciliation remain open. PR #1 is draft; no main merge is warranted.
