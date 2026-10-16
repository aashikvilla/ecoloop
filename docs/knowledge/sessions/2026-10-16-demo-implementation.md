# Demo implementation — 16 October 2026

## Authorization and scope

Owner requested actual implementation with parallel GPT-6 Luna/high agents, separate feature branches, regular commits/pushes and continuation after usage reset. Billing remains deferred. No frontend/backend unit tests, secret env reads, paid calls or deployments.

## Delivered

Preserved prior work at `7cdbfc6`; created `codex/demo-integration` and three separate worktrees/branches. Foundation (`3e8943b`), journeys (`84bd3a8`) and backend (`1ffd550`) are pushed and integrated. Root added shared browser contracts/store validation, payload-bound retries, share transitions and hydration/theme fixes. See PARALLEL_EXECUTION.md for ownership and evidence README for actual browser observations.

All ten route patterns render the household demo; Next production build generated 13 pages, TypeScript passed and ESLint passed. Browser checks covered confirmation, use balance, share lifecycle, plan/preference consent, shopping persistence, reset cancellation, missing item and unavailable photo extraction. Synthetic local data is visibly labeled; no managed AI claim.

Backend foundation includes strict schemas, Firebase identity verification, active membership resolution, scoped Firestore transactions/versioning, actor-bound idempotency, streamed body limits and safe unavailable-assistant errors. It is not wired to the browser demo or verified against live managed services.

## Decisions and surprises

One integration branch owns shared files; workers own disjoint feature files. A demo-first execution exception does not close full cloud phase gates. Main remains unchanged. One hourly heartbeat continues authorized unfinished work when available, quietly skips unchanged billing blockers and avoids duplicate agents.

Real bugs found: CSS layer ordering overrode semantic hero colors/link contrast; provider placement across a streamed boundary caused hydration drift; Next dynamic params needed a Suspense child; retry keys needed full payload and actor binding. Corrections are committed. Run package-local installed tooling; root npx commands had resolved unrelated packages and were not counted as evidence.

## Continue

Follow-up checkpoints: foundation `abb661e` improves truthful copy, date badges, loading labels and reset focus handling; backend `bf73c6d` adds pinned nonroot Cloud Run packaging. Docker CLI was present but its Linux engine unavailable, so image build/deploy remains unproved. Root convenience backend commands now use locked uv project resolution; importing the application through that project succeeded. Draft PR #1 is attached; hourly continuation remains active, quiet on unchanged access blockers. At the usage check, ordinary usage was available (61% of five-hour allowance consumed); no reset credit was used.

Journeys follow-up `59da196` adds destructive confirmations, hydrated missing-state handling, accurate unknown date copy and shared Input reuse. Final root fix `1be5345` mounts the item form only after its persisted record loads, so correction units/storage initialize correctly. Final Turbo build/TypeScript (13/13) and full-src lint passed; browser verified discard cancel retained stock, reset Escape returned focus, and no page errors were collected. All authored code is pushed; only the unrelated user PDF remains untracked.

Read current plan, latest branches and live Sheet before starting. Verify remote checkpoints and working tree; preserve unrelated `docs/6ea0cdb2-aa89-433f-9817-ad0a2c61c9c5.pdf`. Frontend production server was left at port 3002 for the demo. Resume canonical API integration and real managed-service work only under its documented access/billing gates. Do not report deployed readiness from local screenshots.
