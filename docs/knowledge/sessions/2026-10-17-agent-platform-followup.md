# Agent Platform follow-up — 17 October 2026

## Checkpoint

Base commit `e99131c` is pushed to `codex/demo-integration`. The current follow-up is being prepared as a bounded checkpoint on the same branch. PR #1 remains a draft; no `main` merge is eligible.

## Local implementation

- Managed Agents configuration now requires explicit Vertex project, location, and Agent Engine ID; there is no inferred project or default location. In-memory ADK sessions remain the default.
- Memory Bank provider operation tracking persists a `starting` fence before each mutation and a returned LRO handle when available. A later sync attempt polls the locked SDK's operation method once, then reconciles the canonical preference. Delete no longer passes the unsupported `wait_for_completion` option. Ambiguous request completion remains `reconciliation_required` and blocks further mutations; if Google accepts a change but the process never receives its operation handle, an operator must reconcile it manually. Managed Memory Bank remains opt-in and unverified.
- Firebase browser auth now uses tab-scoped session persistence so same-tab reloads retain sign-in; household selection and membership are still reloaded through the API and remain in React state. Home sends users to Ask with configuration-dependent wording.
- Added a seven-prompt synthetic evaluation dataset and prerequisites. The official Agents CLI reference confirms the documented `eval run` options and dataset shape. The repository does not export a standalone ADK app/manifest, and exposing the household agent directly to unauthenticated CLI inference would bypass the FastAPI identity/membership boundary, so no CLI evaluation was run. CLI help stalled on native Windows; Google officially supports Windows through WSL 2.

## Cost alert update

The owner selected ₹2,000/month. Through the authenticated Google Cloud Console, created “EcoLoop all-services monthly budget alert” as a monthly alerts-only budget for all 1,778 services and the billing account's only currently attached project. Actual-spend email alerts are set at 50%, 80%, and 100%; the console showed ₹0.00 / ₹2,000.00 at creation. The pre-existing Gemini API-only ₹2,000 spend cap remains. The all-services budget's spend-cap option was disabled in the UI; therefore no all-services enforcement was created, and the alert is not a hard stop. Usage reporting is delayed. The latest read-only `gcloud billing projects describe` remains blocked because Cloud Billing API is disabled in quota project `681255809395` and target billing details are not readable to the active CLI identity; linked-project inventory, balances, credits, and other service caps remain unverified.

## Verification and boundaries

- Earlier in this follow-up: `uv run --locked python -m compileall -q app`, `uv lock --check`, frontend `npm run lint`, and `npm exec tsc -- --noEmit` passed. Synthetic evaluation JSON parsed and `git diff --check` passed.
- The Memory Bank fencing change separately passed Python compileall. It has not had a deterministic provider-operation contract check, and no unit tests are allowed.
- No managed resource or API was provisioned/enabled, no Google model or managed provider was called, no evaluation was run, and no deployment occurred. Browser writes, live Memory Bank/Session acceptance, Agent Runtime, Cloud Run/App Hosting, and phase exit reviews remain open.

## Next steps

1. Review the current diff and run only authorized static checks; do not add/run frontend or backend unit tests.
2. Commit and push this local checkpoint; keep the branch and PR draft unmerged pending phase evidence and exit review.
3. Before any managed service provisioning, verify all projects attached to the billing account, credits, region, APIs/IAM, eligible per-service spend caps, and rollback plan. The ₹2,000 all-services alert is not a hard total-spend cap.
4. For local AI acceptance, use the authenticated FastAPI assistant path with verified Firebase identity and household membership. Do not use Agents CLI local inference to bypass that boundary; a safe adapter would need to preserve trusted scope.
5. Run the full visible browser regression and managed Sessions/consented Memory acceptance only when the relevant service and browser gates are satisfied.
