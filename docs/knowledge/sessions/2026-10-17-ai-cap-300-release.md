# AI request cap update and production rollout — 17 October 2026

## Request

The owner asked to raise EcoLoop's own daily AI allowance to 300 per user while building and testing, apply it to production, and push all current feature-branch work to `main`.

## Code and repository

- Raised the backend default and validation maximum, manual Cloud Run helper default/range, and main deployment workflow setting to 300 requests per authenticated user per UTC day.
- The counter is shared by assistant and photo-candidate requests. Failed provider calls still reserve a slot.
- Pushed feature branch `feature/managed-agent-context` and fast-forwarded `main` to `4ef6ee5` (`chore(ai): raise per-user daily request cap to 300`). Existing unrelated dirty/untracked files were preserved.
- GitHub Actions run `39044558839` passed candidate build and HTTP/health/auth/CORS smoke. Traffic promotion was skipped because `ECOLOOP_MANAGED_CONTEXT_ACCEPTED=false`.

## Production rollout

- Existing production traffic was on `ecoloop-api-00018-dov`, whose image still validated a maximum of 100. A configuration-only 300 candidate `ecoloop-api-00022-von` failed startup for that reason and received no traffic.
- The main build image includes the matching 300 validator. Deployed it with production's existing Vertex model, in-memory Sessions, Memory Bank disabled, and request/runtime limits unchanged.
- Tagged revision `ecoloop-api-00023-niy` passed `/api/v1/health` (`healthy`) and unauthenticated `/api/v1/households` (401) checks before traffic routing. Cloud Run now routes 100% of API traffic to this revision; its effective `AI_DAILY_REQUEST_LIMIT` is 300.
- Production web URL remains https://ecoloop-web-4wlelpcnca-el.a.run.app. API URL: https://ecoloop-api-4wlelpcnca-el.a.run.app.

## Limits and remaining acceptance

The ₹2,000 all-services budget is alert-only, not a guaranteed spend ceiling. The app cap is per authenticated user, not a Google project quota. Production health confirms Vertex is configured and enabled, but this rollout did not make a paid model request or prove a successful authenticated AI turn. Managed Sessions and Memory Bank remain disabled in production; keep the promotion gate closed until their authenticated persistence, isolation, consent and deletion acceptance passes.

Static verification: Python `compileall`, deployment YAML parsing, PowerShell syntax parsing, and `git diff --check` passed. No frontend/backend unit tests were created or run.
