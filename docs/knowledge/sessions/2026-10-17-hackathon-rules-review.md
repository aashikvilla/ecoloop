# AI Builder Cup rules and rubric review — 17 October 2026

Reviewed the official AI Builder Cup 2026 site, FAQ, and published terms against the current EcoLoop project records. No code, cloud resource, account, or submission was changed.

## Rules and eligibility observations

- Official terms require original code/assets created during the official timeline, a working end-to-end deployed Google Cloud prototype, public GitHub repository, a comprehensive deck, and a demo video. The project's Git history begins on 15 October 2026, within the published 7 September–18 October prototype window, but Git history cannot prove that no pre-existing work or assets were reused.
- Official terms and FAQ describe eligibility as ages 21+, working professionals/entrepreneurs/startups, no students, and all team members physically based in and legal residents of JAPAC. Teams must have 2–4 members; cross-country teams inside JAPAC are allowed. The roster must already be formed by 14 October. Individual eligibility and the registered roster were not checked.
- No explicit prohibition on Codex or coding assistants was found in the published site, FAQ, or terms. The terms do require original work, represent the submitter as sole author/copyright owner, and prohibit third-party rights violations. Codex contributed substantial implementation/review assistance in the recorded project history; disclose assistance accurately and seek organizer clarification if authorship interpretation is material.
- Video duration is inconsistent: the official challenges page says a public three-minute video; the FAQ says under three minutes; the linked terms say strictly three to four minutes and state that terms prevail over inconsistent promotional material. Ask the organizer which duration applies.
- Official sources reviewed: https://aibuildercup.com/, https://aibuildercup.com/themes.html, https://aibuildercup.com/Faqs.html, and the terms linked from the official site.

## Evidence-based rubric estimate

This is a subjective estimate translated into weighted points because the rubric does not publish a numeric scale. It is not a prediction of rank or official judge scoring.

- Technical Merit & Gen AI Implementation: 19/40. Strong household-scoped API, Firebase/Firestore implementation, and Cloud Run web/API deployment. A real Gemini response exists in a local synthetic flow. The deployed assistant is disabled; no authenticated Cloud Run household or AI journey has been accepted; managed Sessions, Memory Bank, and Agent Runtime are unverified.
- Problem Alignment & Impact: 14/25. Clear fit with household food waste/resource efficiency, with recorded outcomes and measured quantities. No validated reduction, user study, or defensible impact baseline is established; current product deliberately avoids unsupported savings claims.
- Innovation & Creativity: 13/25. Explicit confirmation, owner-controlled actions, and honest outcome tracking are useful differentiators. Pantry inventory plus meal suggestions is a familiar category, and no market comparison or unusually novel GenAI behavior is evidenced.
- User Experience & Solution Design: 6/10. Mobile-first design, shared UI and explicit states are implemented. The deployed sign-in attempt failed, the complete deployed journey is unverified, and accessibility review is incomplete.

Estimated total: 52/100, with a plausible reviewer-dependent range of 45–60. The gap between local prototype evidence and deployed end-to-end evidence is the dominant scoring risk.

## AI enablement follow-up — 17 October 2026

The API runtime was configured to use same-project Vertex AI (`gemini-3.1-flash-lite`) with its runtime identity granted `roles/aiplatform.user`. Stable Cloud Run traffic remained pinned to the release revision; an isolated `ai-test` tagged revision was used for product acceptance. Health confirmed Vertex provider configuration, but health is not an inference check.

A direct synthetic low-token Gemini request from local ADC succeeded in 12.4 seconds. Two signed-in synthetic product requests against Cloud Run's ADK path timed out (20-second and 50-second limits), with sanitized 504 responses. They created disposable synthetic accounts/households and confirmed pantry facts; neither approved proposals nor mutated shopping/stock after generation. A further 58-second attempt could not be launched because the local runner lacked the Firebase public web API key; it stopped before account creation or model invocation. No user household data was used. Therefore this pass does not establish a working end-to-end deployed AI journey.

The HLD/LLD now marks this boundary explicitly: Vertex is configured and directly callable, while the authenticated product ADK inference path remains unaccepted. The estimated rubric score remains 52/100 (19/40 technical, 14/25 impact, 13/25 innovation, 6/10 UX) because configuration and an isolated model diagnostic do not resolve the dominant deployed product-flow gap. This estimate remains subjective, not a predicted rank.

The published FAQ says eligibility is professionals/entrepreneurs/startups, 21+, based in JAPAC, teams of 2–4, no students, and cross-country JAPAC teams are allowed. The official terms require physically based and legal residents of JAPAC and reserve organizer verification rights. The public materials do not expressly ban coding assistants, but they do state the entrant represents themselves as sole author/copyright owner and require fresh code/assets. Since Codex provided substantial coding assistance in project history, disclose that fact accurately and ask the organizer for a written ruling; do not assume assistance is automatically allowed or prohibited. Submission requirements also conflict on demo duration: FAQ/challenges say under/three minutes while linked terms say strictly three to four minutes; terms say they prevail over inconsistent promotional materials, but ask the organizer to resolve this before finalizing the video.

## Current limits

The latest Cloud Run release record says frontend/API health and unauthenticated API rejection were verified, but deployed Firebase sign-in failed and the assistant was disabled because the available Gemini key project had billing disabled. Do not claim deployed AI functionality or complete cloud acceptance from those checks. Team eligibility, original-asset provenance, submission artifacts, and organizer interpretation of the video rule remain unverified.

No architecture decision or reusable prevention lesson was established, so no decision or past-mistake entry was added.
