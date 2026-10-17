# Account outcome and sharing controls — 17 October 2026

## Scope

Continue local frontend integration on `codex/demo-integration`. Keep browser writes disabled pending live identity/database acceptance and owner approval. No env files, cloud writes, provisioning, deployment, billing changes, or model calls.

## Implementation

- The committed outcome-controls branch (`d6396b1`) and sharing-controls branch (`1e2e5b1`) were already ancestors of the integration checkout through merges `22b2548` and `3760159`. No cherry-pick or source-branch edit was needed.
- Mounted `OutcomeControls` and `ShareControls` in the account route's existing actor/household keyed subtree. Both receive the existing ID-token provider, selected household, and shared `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS` flag. The subtree remounts on user/household changes, preserving pending-operation isolation.
- Kept full paginated private history and clarified that the share component's 25-record list is for lifecycle actions, with older activity in the paginated view.
- Removed stale copy that said browser demo records still existed. Kitchen, Settings, status, architecture, and parallel-execution notes now describe the account controls and remaining unavailable routes consistently.

## Review and verification

- Three GPT-6 Luna/high read-only reviews found no critical backend scope, version, stock, or idempotency blocker. Review confirmed both feature commits were already integrated and the UI had not been mounted. The outcome reviewer emphasized retaining the existing keyed remount; it remains in place. The share reviewer noted the 25-record action list, now clearly distinguished from paginated history.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed. No frontend/backend unit tests were run or added.
- Browser inspection on the refreshed local production server showed Ask with API-only copy and a signed-out Account with record-load buttons disabled. No matching Auth user was available, so mounted signed-in controls, authenticated reads, and writes were not exercised.
- The existing open browser tab retained an old scripted DOM after the first server refresh. A fresh tab on `127.0.0.1:3002` displayed the current API-only build; see [past-mistake pattern](../PAST_MISTAKES.md).

## Remaining gates

Firebase providers and local domains are enabled per [the Auth session](2026-10-17-firebase-auth-enabled.md), but the synthetic UID `ecoloop-judge-demo` is not provisioned. Authenticated API acceptance and wrong-household denial remain unverified; share/activity indexes are undeployed. Keep the release flag false until live identity, database transactions, idempotency and owner approval are established. Capture/intake and item detail, proposal persistence/approval, managed preferences/Sessions/Memory Bank, and reviewed deployment/whole-journey acceptance remain open. No `main` merge is eligible.

Architecture pointer: [architecture](../ARCHITECTURE.md); current status: [STATUS](../../STATUS.md); execution ownership: [parallel execution plan](../../planning/PARALLEL_EXECUTION.md).
