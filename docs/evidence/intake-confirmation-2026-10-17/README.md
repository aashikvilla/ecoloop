# Candidate review and confirmation — 17 October 2026

## Integrated scope

- Manual/text intake persists creator-private candidate rows separately from canonical Kitchen observations.
- `/kitchen/review?id=…` loads the intake, allows edits to name, amount/unit, date type/value and storage, and lets the user select which rows to confirm.
- Confirmation requires a separate explicit consent checkbox and POST. Selected rows become canonical Kitchen facts in one Firestore transaction; unselected rows remain pending. The intake version advances and becomes `CONFIRMED` only when no candidates remain.
- The transaction rechecks active membership, creator ownership, intake version, candidate IDs and absent canonical item IDs. Retry identity is bound to the authenticated actor, target intake and exact command payload. A stale version or repeated candidate conflicts instead of overwriting.
- Requests use the validated `ApiResult` envelope, current Firebase token and selected household. Scope changes cancel/clear private state. POST remains gated by the existing default-off `NEXT_PUBLIC_ECOLOOP_ENABLE_COMMANDS` flag.

## Checkpoint and reviews

- Backend branch `codex/intake-confirmation-api`: `824624f` plus retry-binding fix `171e9e5`.
- UI branch `codex/intake-confirmation-ui`: `bf48485`, `8123384`, `4c22aea`, and lint/type correction `f40da8b`.
- Sequential integration merges on `codex/demo-integration`: `50ce49b`, `29246c1`, and `69a6e8e`.
- Independent critical review found and corrected a cross-intake idempotency replay issue and client parsing of the shared API response envelope. Final backend and UI reviews found no remaining concrete findings. These were static reviews; Firestore transaction execution and browser behavior were not part of them.

## Local verification

- `npm run lint` — passed.
- `frontend/node_modules/.bin/tsc.cmd --noEmit` — passed.
- `npm run build` — passed; all 14 static pages generated, including `/kitchen/review`.
- `uv run --frozen python -m compileall -q app` — passed.
- Pydantic wire-shape checks on worker branches and `git diff --check` — passed.
- No frontend/backend unit tests were added or run.

## Bounded synthetic live acceptance

On 17 October, the signed-in synthetic user used the empty test household `d8e5ef4cb23b4925a383ae1ae29792c5`:

- Created one text intake with two unknown-amount names. The authenticated API returned 201 and showed two unconfirmed candidates; no canonical Kitchen rows were written at this step.
- Edited “E2E test spinach” to “E2E confirmed spinach”, deselected rice, checked the explicit consent box and confirmed. The API returned 200; the UI reported one confirmed and one remaining at intake version 2.
- Confirmed the remaining rice candidate. The API returned 200; the intake was completed at version 3 with no remaining candidates.
- Kitchen API/UI readback showed exactly two records, both with unknown amount/date/storage. A narrow Firestore read found one confirmed intake and two distinct canonical observation IDs.
- The first browser preflight failed because API CORS did not include local port 3003. The collection was verified empty before retrying with the same idempotency key. A temporary process-only CORS allowlist for `http://127.0.0.1:3003` allowed the retry. No env file was inspected or edited.

This proves one create/edit/partial/full confirmation/readback journey. Replay after a successful but lost response, concurrent conflicts and duplicate prevention under contention remain open. The write flag was enabled only for this local browser process and is false in the ordinary app configuration.

## Live and release limits

The bounded synthetic journey does not close the M2 phase. M2.01.02 structured photo extraction is not implemented, M1.02.03 is not verified, and live retry/conflict acceptance is incomplete. No MVP task was marked complete from this evidence. The code is locally reviewable on `codex/demo-integration`; PR #1 is still draft and `main` remains unchanged. Billing, Cloud Run provisioning/deployment and deployed whole-flow acceptance remain open.
