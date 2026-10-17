# Cloud Run AI activation follow-up — 17 October 2026

## Outcome

The owner asked to enable AI on the Cloud Run app and choose models by workload and cost. Cloud Run now has Vertex AI configured and enabled. This is a configuration/deployment success, not a successful product inference acceptance.

## Model assignment

- The product currently has one ADK household orchestrator, not separate kitchen/shopping agents. Its three authenticated, household-scoped tools are read-only pantry, shopping-list, and saved-plan reads. Authorization, stock math, writes, and outcome recording remain deterministic application code.
- The orchestrator uses Gemini 3.1 Flash-Lite through Vertex AI at the global location. Photo candidate extraction is a separate multimodal call with its own `PHOTO_MODEL` configuration; it currently also uses Gemini 3.1 Flash-Lite because it accepts image input and structured output. Both model settings can be changed independently after measured quality and latency evidence.
- `AGENT_THINKING_LEVEL` and `PHOTO_THINKING_LEVEL` are independently configured as `MINIMAL` for the low-complexity household suggestion and candidate-extraction tasks. The previous model default was Gemini 3's `HIGH` thinking level. Google describes `MINIMAL` as the lowest-thinking option for simple tasks and `LOW` for throughput-sensitive requests. See [Gemini 3 thinking levels](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/get-started-with-gemini-3?hl=en) and the [Vertex GenerationConfig reference](https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/GenerationConfig).
- Gemma is not deployed. Running an open Gemma model would add model-hosting and serving capacity to this small, low-volume hackathon workload. Revisit only if a bounded cost/quality benchmark shows a clear advantage.
- The published Vertex global list price observed for Gemini 3.1 Flash-Lite was $0.125 per 1M input tokens and $0.75 per 1M output tokens. The deployed 2,048 output-token ceiling would imply at most about $0.00154 of output-token list cost per completed request, before input tokens and any pricing changes/discounts. Failed calls can still incur usage; no actual token count or bill was obtained. See [Vertex AI generative AI pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing?authuser=3).

## Code and deployment checkpoints

- `8a76551` enabled `AGENT_PROVIDER=vertex`, Gemini 3.1 Flash-Lite for assistant and photo extraction, project `ecoloop-staging-20261015`, and global location; the candidate health gate now requires configured and enabled Vertex status.
- `85334c7` makes malformed model-generated pantry IDs fall back to a bounded, same-household recent query instead of aborting an ADK turn. It also directs the model to copy opaque IDs from the supplied context and preserves the uncertainty of the bounded fallback.
- `7d08d19` bounds ADK requests to 50 seconds, output to 2,048 tokens, and three requests per user per day.
- `3f12969` configures Gemini 3 thinking to `MINIMAL` separately for both ADK and photo candidate extraction.
- GitHub Actions deployments `39036298426`, `39036779993`, `39037238775`, and `39037686836` passed build, candidate health/CORS/auth checks, and promotion. API URL: [https://ecoloop-api-4wlelpcnca-el.a.run.app](https://ecoloop-api-4wlelpcnca-el.a.run.app); web URL: [https://ecoloop-web-4wlelpcnca-el.a.run.app](https://ecoloop-web-4wlelpcnca-el.a.run.app). Final API revision `ecoloop-api-00018-dov` has 100% traffic.
- Live `/api/v1/health` returns HTTP 200, `provider=vertex_ai`, `configured=true`, `enabled=true`, and `runtime_check=not_performed`. It reports `session_store=in_memory_unmanaged`, `managed_sessions=false`, `memory_bank=not_configured`, and `managed_memory=false`.

## Product acceptance and remaining gate

- Browser acceptance used only the synthetic `Synthetic judge kitchen` household under the signed-in judge account. No proposal approval, pantry mutation, shopping mutation, photo upload, or canonical write occurred.
- The old deployed model default exhausted the 20-second and later 50-second assistant request timeouts. The first live tool call also produced a sanitized 503 when Gemini supplied invalid pantry IDs; that failure path is now fixed. The `MINIMAL`-thinking revision was deployed after the last failed product request, but no model request was made against it. No valid live typed card and durable-history readback is yet evidenced.
- Remaining acceptance: after the user/day limit permits another call, submit one synthetic prompt on `/ask`, confirm a typed proposal and private-history readback, and verify no canonical change unless explicitly approved. Do not repeat attempts if the result is unchanged or a rate limit appears.
- The previously observed ₹2,000 all-services monthly budget is alerts-only, not a hard cap. The existing Gemini API-specific cap does not establish a total Vertex spend ceiling. Do not describe current budget alerts as guaranteed spend containment.
- Existing broader `roles/aiplatform.user` also appears on the runtime identity alongside the custom model invocation role. The broad grant's source was not identified or changed in this pass.

## Verification

- Backend `compileall`, Python SDK `ThinkingConfig(MINIMAL)` construction, deployment-workflow YAML parsing, and `git diff --check` passed.
- No frontend/backend unit tests were run. No API key or real environment file was read. No deployment, billing, budget, or IAM change was made by this follow-up beyond the application revisions described above. No extra model requests were made after the final 50-second timeout and before the `MINIMAL`-thinking deploy.
