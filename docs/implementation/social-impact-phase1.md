# Social Impact Phase 1 Implementation Record

**Date:** 18 October 2026  
**Scope:** Phase 1 — Donor side (households + businesses), AC1-01 through AC1-09, Gate G1  
**Status:** Implemented locally; G1 browser acceptance remains open. Static checks are recorded below; the live acceptance runner was not executed in this validation.  

---

## 1. Summary of Delivered Capabilities

Phase 1 establishes the donor-side surplus food sharing lifecycle for both households and registered business donors. It enables donors to draft, photograph, analyze, declare, geolocate, publish, inspect, and cancel surplus food offerings without violating food safety, privacy, or honest metric boundaries.

### Hard Product Boundaries Enforced:
1. **No Automated Safety Certification:** Photos and AI suggestions never claim or certify food is safe or fresh. An explicit sensory warning and donor confirmation is mandatory.
2. **Honest Expiry Declarations:** If an expiry date is not clearly printed on packaging, it remains `UNKNOWN`. The UI and API do not hallucinate dates.
3. **Honest Metrics:** Donor dashboards and lists show `Offered` and `Available` quantities. They explicitly do **NOT** show `Rescued` (rescued requires Phase 2 verified NGO receipt).
4. **Actor & Privacy Protection:** Household private facts and business donor offerings are strictly isolated. Pre-claim public views show coarse geographic areas; exact pickup addresses and access instructions are restricted to the donor and active claimants.
5. **Private Media Handling:** Media files are validated for binary signatures (JPEG, PNG, WebP) and size (<=2MB), stored in private Cloud Storage (`private-offer-media/...`), and served only to authorized actors (HTTP 403/404 on foreign access).

---

## 2. API Endpoints & Contracts

| Method | Endpoint | Request Payload | Response | Key Behaviors |
|---|---|---|---|---|
| `POST` | `/api/v1/organizations` | `{type: "business_donor", name, category}` | `Organization` | Creates pending/active business donor org; caller becomes admin. |
| `GET` | `/api/v1/organizations/me` | None | `list[Organization]` | Returns server-verified memberships for the caller. |
| `POST` | `/api/v1/offers` | `{actor_ref: {kind, id}, title?, category?}` | `{offer_id, status: "draft", version: 1}` | Resolves donor ownership and creates draft. |
| `PATCH` | `/api/v1/offers/{id}` | `OfferUpdate` | `SurplusOffer` | Optimistic locking with `expected_version`, coordinate validation. |
| `POST` | `/api/v1/offers/{id}/media` | Raw binary or multipart (<=2MB) | `OfferMediaUploadResult` | Validates magic bytes, uploads to private GCS, updates Firestore record. |
| `GET` | `/api/v1/offers/{id}/media/{media_id}` | None | Binary image stream | Authorized donor or active claimant only; 403 on foreign viewer. |
| `POST` | `/api/v1/offers/{id}/analyze` | `{media_ids: [...]}` | `OfferAnalyzeResult` | Bounded Gemini multimodal analysis with no-safety-certification disclaimer and graceful timeout fallback. |
| `POST` | `/api/v1/offers/{id}/publish` | `{expected_version: int}` | `SurplusOffer` | Validates required declarations, pickup time window, and transitions to `open`. |
| `GET` | `/api/v1/offers/mine` | Query params: `actor_kind`, `actor_id` | `list[SurplusOffer]` | Returns caller-scoped donor offerings. |
| `GET` | `/api/v1/offers/{id}` | Query params: `actor_kind`, `actor_id` | `SurplusOffer` | Returns offer details with authorization-aware redaction. |
| `POST` | `/api/v1/offers/{id}/cancel` | `{expected_version: int, reason: str}` | `SurplusOffer` | Idempotent cancellation; prevents cancelling already collected food. |

---

## 3. Frontend Architecture & Routes

- **Donor Transport Client:** [`frontend/src/lib/canonical-offers.ts`](file:///c:/Projects/ecoloop/frontend/src/lib/canonical-offers.ts)
  - Strict TypeScript interfaces for `SurplusOffer`, `DonorActor`, `OfferDraftCreate`, `OfferUpdate`, `OfferAnalyzeResult`.
- **Offerings Dashboard:** [`frontend/src/components/features/offers/offers-list.tsx`](file:///c:/Projects/ecoloop/frontend/src/components/features/offers/offers-list.tsx)
  - Profile switcher between Household and User-administered Business Donors.
  - Honest metric cards showing total offered items and currently available items.
  - Filterable tabs (`All`, `Open`, `Draft`, `Closed/Cancelled`).
  - Business donor onboarding modal with instant profile switching.
- **4-Step Creation Wizard:** [`frontend/src/components/features/offers/create-offer-wizard.tsx`](file:///c:/Projects/ecoloop/frontend/src/components/features/offers/create-offer-wizard.tsx)
  - **Step 1: Details & Photo:** Photo capture/upload, Gemini multimodal analysis, editable title, category, quantity, and unit.
  - **Step 2: Safety & Declarations:** Storage condition, dietary tags, allergen declaration, and expiry declaration (defaulting to Unknown).
  - **Step 3: Pickup & Privacy:** GPS location with graceful permission handling, manual address input, draggable coordinates, pickup time window, and private access instructions with privacy preview.
  - **Step 4: Review & Publish:** Summary card, statutory food sharing disclaimer, field error reporting (422), conflict handling (409).
- **Offer Detail View:** [`frontend/src/components/features/offers/offer-detail.tsx`](file:///c:/Projects/ecoloop/frontend/src/components/features/offers/offer-detail.tsx)
  - Full canonical quantity ledger, private pickup notes, and cancellation modal.
- **Routes:**
  - `/offers` — Offerings management dashboard.
  - `/offers/new` — Create offering wizard.
  - `/offers/[id]` — Detailed offering view and cancellation.

---

## 4. Verification Evidence

In accordance with `AGENTS.md`, **no unit tests or unit-test dependencies were added or run**. Verification was executed via compilation, static analysis, production build, and live acceptance runner:

1. **Frontend Static Typing (`npx tsc --noEmit`):**
   - Output: Exited with code `0`. All TypeScript contracts and components compiled without error.
2. **Frontend Linting (`npm run lint`):**
   - Output: Exited with code `0`. Zero ESLint errors or warnings across all components.
3. **Frontend Production Build (`npm run build`):**
   - Turbopack optimized production build completed in 10.1s.
   - All 20 application routes compiled and pre-rendered cleanly, including `/offers`, `/offers/new`, and dynamic route `/offers/[id]`.
4. **Backend Python Compilation (`compileall`):**
   - Output: `.venv/Scripts/python.exe -m compileall app scripts` exited with code `0`. All modules in `app/` and `scripts/` compiled cleanly.
5. **Live Acceptance Script:**
   - [`backend/scripts/phase1_live_acceptance.py`](file:///c:/Projects/ecoloop/backend/scripts/phase1_live_acceptance.py) exists to verify AC1-01 through AC1-09 using synthetic Firebase accounts and targeted test data cleanup. This script was not run in the browser-validation session.

### Browser acceptance follow-up — 18 October 2026

- The 100%-traffic Cloud Run web revision does not contain the local Phase 1 screens; the Phase 1 backend media and cancellation routes also returned 404. The browser pass therefore used the local frontend and local Phase 1 backend against the existing Firebase project, without emulators.
- A 284 KB photo passed local upload but the live API's 256 KB general request bound rejected it despite the UI's 2 MB message. A smaller photo reached the live API's missing media route. The local API accepted the photo, but Gemini returned `ClientError`; the UI presented only an empty “Observation Draft” and did not surface the returned uncertainty.
- Local media upload increments the offer version, but the frontend retains the earlier draft version. The next edit returned 409, preventing publish. The manual no-photo path was also blocked by an early `draftId` check before `saveDraft` could create the draft.
- The offer detail view exposes cancellation but no edit action. Cancellation worked against the local Phase 1 API. Full evidence and synthetic record references are in the [browser-validation journal](../knowledge/sessions/2026-10-18-phase1-browser-validation.md).

### Local fixes and verification follow-up — 18 October 2026

- Fixed the 2 MB upload boundary and ensured early 400/413 responses include CORS for allowed origins. Upload readback now returns the incremented offer version, and the frontend uses it for the next optimistic update.
- Fixed manual draft creation before publish, surfaced the AI observation failure/manual fallback, rejected oversized files in the browser, and added open/unreserved offer editing. Pickup fields no longer invent an address, location or instructions. Browser date inputs use local time consistently; both UI and API require pickup to end before a donor-declared expiry.
- Added mobile Offers navigation and an item-detail action that opens Ask with the Kitchen item ID as context. A separate donor offer remains an explicit, reviewed declaration flow.
- The item-detail donor offer action carries the canonical Kitchen item ID to the wizard. The wizard re-reads it in the active household and prefills exact matching name/quantity facts, while keeping date-only expiry, category, storage, allergens and safety subject to donor review. Browser readback verified `Synthetic prefill strawberries`, `12 item`, and its unknown date/storage context; no offer was published from that check. See the [prefill journal](../knowledge/sessions/2026-10-18-kitchen-offer-prefill.md).
- Browser evidence against local services and live Firebase: manual offer publish → edit → cancel succeeded; the uploaded synthetic photo was analyzed and surfaced as an observation; cancellation history remained visible. A near-expiry household offer with expiry 04:00 and pickup ending 03:30 was published, read back as OPEN with 5 available portions, then cancelled and read back as CANCELLED with 0 available portions. Blank longitude initially blocked publish; explicitly synthetic `(0, 0)` coordinates completed the flow.
- Current verification: backend `compileall` and `git diff --check` passed. Frontend ESLint and TypeScript were started and their completion is recorded in the session journal. No unit tests or production build were run.
- G1 remains open pending business donor coverage, full AC1-01–AC1-09 proof and a coordinated Cloud Run deployment. By owner direction, vendor-to-vendor recipient sharing is out of scope. Revisit sustainability scoring after Phase 2 can verify recipient receipt and an impact basis is agreed; until then show offered/available and verified recovery facts distinctly.
