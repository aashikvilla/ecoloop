# Managed agent context

## Workload split

- Gemini 3.1 Flash-Lite continues to serve assistant and image-candidate inference at Vertex `global`.
- Agent Engine Sessions and Memory Bank use a separate regional setting, `AGENT_VERTEX_ENGINE_LOCATION=asia-south1`, so managed context does not change the Gemini endpoint.
- The Cloud Run service keeps the existing ADK orchestrator. No Agent Runtime agent is deployed; the Agent Engine resource exists only to back Sessions and Memory Bank.
- Sessions retain conversation events for at most 24 hours and are replaced after 40 events. Session identities remain scoped to the authenticated owner and selected household.
- Memory Bank contains only an explicitly consented preference already stored in owner-private Firestore. It receives no transcript or pantry facts. Retrieval results are candidates that must match the current canonical owner record.

## Cost and rollout controls

- The app reserves at most 12 assistant/photo AI requests per authenticated UID per UTC day. This is an app-level guard, not a Google quota or project-wide spend cap; failed calls consume a slot.
- The existing ₹2,000 billing-account budget is an alert, not a guaranteed all-services cap. Credits and a project-wide hard stop remain unverified.
- GitHub deployment creates a candidate and checks health/configuration. Traffic promotion is separately gated by the repository variable `ECOLOOP_MANAGED_CONTEXT_ACCEPTED=true`, which stays false until authenticated Session/Memory Bank acceptance is reviewed. Main pushes remain automatic after that gate is opened.
- Managed context remains unverified until an authenticated managed-session persistence check and consented memory create/retrieve/revoke/delete checks pass. Health can report only configuration; it never calls providers.
- Do not send personal preference data to Memory Bank without the explicit saved-preference consent already required by the Settings UI.

## Resource

`projects/ecoloop-staging-20261015/locations/asia-south1/reasoningEngines/8405027522533654528`

The Engine was created without agent runtime code. Its numeric ID is held in the GitHub Actions variable `ECOLOOP_AGENT_ENGINE_ID`; it is not committed to a real environment file or as a secret value. Cloud Run's pre-existing `roles/aiplatform.user` includes the required Session and Memory Bank API permissions; no new IAM grant was made.
