# Stitch design audit and visual contract

Date: 15 October 2026. Scope: the ten supplied household mobile screens, their HTML exports, and `ecoloop_organic_modernism/DESIGN.md`. All ten root `screen.png` files were visually inspected; all ten HTML files were read for visible text and shared configuration. This is design evidence for the replan, not evidence that any displayed integration or feature exists. Proposed route paths below are planning names: the HTML exports use placeholder links and do not establish implemented application routes.

## 1. What the designs actually describe

The repeated shell has **Home, Kitchen, Ask, Shop** as four bottom destinations, household identity at the top, an assistant badge, and profile access. It describes a household food assistant: record food, review extracted candidates, see inventory, ask for meals or buying advice, maintain a shopping list, and log what happened. Sharing and activity are secondary flows. Water, energy, and broader circularity appear only as future categories. Industrial kitchens, NGO operations, carbon accounting, merchant checkout, and a general sustainability marketplace have no delivered operational screen in this set.

All source paths below are relative to `docs/prototypes/`. Each screen folder contains `screen.png` and `code.html`.

| Source folder | Proposed destination | Screen contract and dependencies |
|---|---|---|
| `ecoloop_household_food_assistant_home` | `/` | Greeting, dinner suggestion, Scan food / Shopping list / Meal plans shortcuts, attention items, weekly recorded activity. Derive counts from household records; avoid a separate meal-calendar product just because a shortcut exists. |
| `ecoloop_my_kitchen_inventory` | `/kitchen` | Inventory summary, search, attention/low-stock filters, item cards, edit/use actions, add-food options. The screenshot has blank summary/insight content that the HTML identifies; implement readable content rather than reproduce blank rendering. |
| `ecoloop_add_food_smart_capture` | `/kitchen/add` | Photo, receipt, list-photo, manual entry modes; gallery/camera choice; extraction action; explicit review explanation. A camera-looking static image is not camera functionality. |
| `ecoloop_review_detected_food_items` | `/kitchen/review/:captureId` | Candidate cards with editable quantities/units, optional printed package date, duplicate choices (add/replace/new batch/skip), explicit save. Candidate review is a distinct stage before canonical inventory mutation. |
| `ecoloop_use_soon_food_action` | `/kitchen/items/:itemId` | Recorded quantity/check time/storage, meal suggestions, cook/share/used/disposal actions, disposal reason and partial amount. Preserve context when opening Ask. |
| `ecoloop_ask_ecoloop_assistant` | `/ask` | Context chips, prompt suggestions, conversation, recipe cards, servings/spice controls, pantry check, shopping-list action, input attachments. Evidence supports one assistant experience; it does not require multiple agents. |
| `ecoloop_ask_ecoloop_shopping_decision` | `/ask` with buying context | In-store photo, confirmed stock versus recipe need versus proposed pack, have-enough/list choices, draft list. It is an Ask state, not an additional navigation destination. |
| `ecoloop_smart_shopping_connected_services` | `/shop` | Pantry reminder, planned list, optional preferences and example patterns, receipt import, external merchant link. Connected-service section needs feasibility correction before release. |
| `ecoloop_share_before_waste` | Secondary item action | Household/trusted-circle offer draft, quantity, condition note, collect-by time, draft → offered → accepted → handover. Community sharing is explicitly preview-only. Actual audience and whether sharing enters the first release follow the approved scope decision. |
| `ecoloop_your_circular_impact` | Secondary `/activity` | Recorded food actions, sharing stages, disposal streams and provenance. Food active; water/energy/circularity future. No fifth bottom tab. Put access in Home/profile/item activity if retained. |

## 2. Accepted visual contract

Use the screenshots and shared HTML token configuration as the concrete visual reference. Keep the light mint canvas, dark forest primary actions, white rounded cards, pale botanical containers, terracotta attention accents, pill filters, sparse Material Symbols icons, food photography, generous vertical rhythm, and floating white bottom dock. Home has a prominent forest dinner card; Kitchen uses compact item cards; Ask uses dark user bubbles and light assistant cards; Shop uses grouped checklists. These patterns make the reduced scope coherent.

| Token or behavior | Concrete source value |
|---|---|
| Canvas / surface / background | `#f3fbf6` |
| Primary / primary container | `#143529` / `#2b4c3f` |
| Main text / secondary text | `#151d1a` / `#414844` |
| White card / low container / high container | `#ffffff` / `#edf6f0` / `#e2eae5` |
| Secondary / secondary container | `#994529` / `#fe9472` |
| Error / error container | `#ba1a1a` / `#ffdad6` |
| Typeface | Plus Jakarta Sans; HTML font request loads 400/500/700 although tokens also name 600 |
| Mobile heading / body / small body | 24px/32px, 14px/21px, 12px/17px; larger mobile hero token 30px/38px |
| Gutter / core spacing | 16px; 4/8/16/24/36px spacing tokens |
| Configured radius | Default 16px; `lg` 32px; `xl` 48px; full pill 9999px; individual cards also use Tailwind `rounded-2xl` |
| Mobile shell | Fixed header and bottom dock, safe-area padding, vertically scrolling content |

The DESIGN.md prose contradicts its own front matter and the actual screens. It calls the canvas oatmeal `#F8F6F0`, primary `#2B4C3F`, secondary `#C96A4B`, and text `#1C2421`; those are not the shared HTML semantic values above. It also describes Shop / Circular Loop / Impact / Bag navigation, jars, deposits, tote return and checkout mechanics. Treat those passages as inherited design prose, not extra product scope. Keep Home / Kitchen / Ask / Shop. Do not implement deposit/tote workflows from this document.

Resolve accessibility details in implementation while preserving appearance: permit browser zoom (exports disable it); provide readable contrast, named controls, focus states, reduced-motion behavior, semantic headings, and at least 44px tap areas. Several exported controls are only 36–42px high. Reserve dock and keyboard space so Ask input and final save actions remain usable. Dark-mode classes are configured, but no dark screen/token set was supplied; a faithful dark palette requires an explicit design adaptation. Test the future implementation at 360px and wider rather than hardcode PNG dimensions or the exports' repeated 884px minimum height.

## 3. Required content and state adaptations

1. **Dates and condition:** Home's “best by tomorrow,” “3 days left,” “ready to use,” and “best used today” imply more knowledge than last-check timestamps provide. Render a recorded label date with its source, or “Check this item.” A photo does not certify freshness. Replace “zero waste” with “use what you have.” Sensory observations can be user notes; they cannot establish microbiological safety. Never silently transform an old record into spoiled or unavailable stock.

2. **Candidate confirmation:** Preserve the review screen's unconfirmed badges and duplicate choices. Do not default an unknown milk volume to a verified 1 litre; require quantity confirmation or preserve unknown. Adding a photo of existing food must not automatically add another batch. Save should explain which rows will commit and reject stale inventory conflicts; uncertain candidates must remain separate from confirmed recipe availability.

3. **Recipes and buying arithmetic:** Replace “100% Available Ingredients” with “Recorded in your kitchen” unless a defined completeness calculation has fresh confirmed inputs. Do not treat an ingredient match as enough quantity or safe-to-eat proof. Shopping shows 500g becoming +6 tomatoes without a supported conversion; retain grams or ask for a count. Show recipe portions as estimates, quantities by compatible units, and stale stock as needing confirmation. Replace automatic “Need this” for three-day-old spinach with “Check stock.” The second shopping checklist repeats “At home: 4 tomatoes” under three unrelated rows; remove this export artifact.

4. **Measured activity:** Sharing's “saves approx 0.8 kg CO₂e” violates the project invariant and the activity screen's own promise. Remove it. Home's “rescued” and 92% planned-use metric need defined events and denominators; prefer counts of user-recorded actions. Activity's 42/30/18/10 percentages lack a defensible common unit and can mix current stored stock with period flows. Omit the chart until denominator, period, partial quantities and event deduplication are specified. Meals, pieces, grams and containers cannot be summed. Disposal is explicitly an estimated 180g in one screen: preserve its estimation provenance instead of calling it measured or “no estimates.”

5. **Sharing boundaries:** Keep plate leftovers, spoiled food and unsealed perishables blocked from offers. “Self-checked,” “verified item condition,” and “ready to eat” must be presented as user declarations without an EcoLoop safety certification. Never infer community eligibility from a photo. The fictional food pantry's verification and 1.4km distance are demo content. Recipient acceptance is distinct from confirmed handover; no impact credit on draft/offer. Sharing counts disagree (two handoffs in summary versus one complete in stage display); derive every view from the same event model. Human food-safety review, temperature records and capacity requirements still govern eligible external recovery if introduced later.

6. **Merchant and privacy claims:** “Swiggy Instamart Direct Sync,” available authentication, verified order logs, and “strictly private on device” are unsupported architecture/integration claims. Display manual receipt import and an ordinary external merchant link for the reduced product. Keep future integrations disabled and honestly labelled until authorized APIs and consent exist. No fake checkout or inventory changes from opening a merchant. Do not show GBP prices, refill compatibility, return loops, due-tomorrow predictions or verified-live badges without relevant data. Preference filters do not establish lifecycle superiority; retain that qualification.

7. **Honest state:** The exports largely depict filled success states. The plan must add first-use/empty inventory, extraction error or timeout, unreadable image, camera denial, failed save/retry, insufficient stock, unknown units/date, offline/stale view, assistant failure and no recipe match. Hardcoded family names, profile photo, counts, activity and timestamps are examples. Label seeded demonstrations consistently and avoid mixing examples with a household's real records.

## 4. Provenance and duplicate status

There are **21 unique source artifacts represented twice**: ten HTML files, ten PNG files and DESIGN.md. Every root artifact has an identical SHA-256 counterpart under `docs/prototypes/stitch_ecoloop_mobile_pwa/` at the same relative path. No divergent revision was found. Preserve originals; use the root copy as the convenient citation location. Hash comparison is evidence of identity, not a reason to delete either export without a separate housekeeping decision.

Representative complete SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| Home `code.html` | `D221E39D2E150653882687DF050377FCDD5C9068302BED1856D7AC94C0F052ED` |
| Home `screen.png` | `5F4477CD7E069E40004937B8ED346AFDC4AD51A18C34C341C03E961624781B1B` |
| Review `code.html` | `F2A7F19B4A372754DEE5A7EB9206431634C1CA3ECFCCEEADE3A912AB49F9DA68` |
| Review `screen.png` | `6B470834B886142FCCD2DCA64AEB64D28A909E9098C78B6493258CA08F14FB66` |
| `ecoloop_organic_modernism/DESIGN.md` | `2E24FEFE5128569A63CE90BF8D05B53F563E8E1BB64C8D76CF07C3DCD9539761` |

All other screen folders in the mapping table also matched both files. Static HTML uses Tailwind CDN, Google fonts, Material Symbols and externally hosted example photos. Treat these as visual references; future implementation needs normal application components and controlled assets. No application code, source prototype, existing plan or Drive file was changed by this audit.
