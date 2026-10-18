# EcoLoop AI demo recording runbook

Target length: **2:58**. Use the deployed app at the URL in the root README and the demo accounts in that same README. The Kitchens and twelve Bengaluru recovery scenarios are already populated; do not spend recording time onboarding accounts or entering inventory.

## Preflight

- Use one browser profile for the personal account and a second profile/window for the NGO account. Sign in before recording; verify the page is loaded and no account chooser or setup wizard is open.
- In the personal workspace use Asha's Kitchen. It contains confirmed spinach with a recorded `BEST_BEFORE` date, tomatoes, bread, potatoes and other recipe ingredients. Treat the recorded dates as household reminders; they do not prove food safety.
- Prepare one clear tomato product JPEG under 2 MB. The photo smoke identified **vine tomatoes** and the Kitchen comparison now matches the unambiguous pantry item **Tomatoes**. The demo image may be chosen before recording; do not add Kitchen stock on camera.
- In the NGO workspace use the saved Bengaluru pickup base and the exact request below. The current dataset returns two options from six nearby areas and Google Routes orders the round trips.
- Keep the existing synthetic labels visible. All twelve seeded recovery entries are rehearsal scenarios with unknown condition/storage, cannot be reserved and cannot be counted as collected, received or recovered.
- Record the active window at 1920×1080 or 1600×900, hide unrelated tabs/notifications, use a clean browser profile, and record system audio plus a separate voice-over. Keep the pointer still during narration. Capture at 30 fps; trim only pauses and transitions.

## 2:58 story and narration

| Time | Action | Voice-over |
| --- | --- | --- |
| 0:00–0:35 | Personal **Shop**: upload the prepared tomato photo, let Gemini identify it, then show the confirmed Tomatoes Kitchen match and purchase advice. | “Food waste can begin before groceries come home. EcoLoop recognizes what we’re considering and checks confirmed household stock before advising us.” |
| 0:35–1:10 | Personal **Home**: open spinach in Needs attention and request a recipe. Show the meal proposal and its linked confirmed ingredients. | “At home, EcoLoop prioritizes food by the dates we recorded and suggests a meal from ingredients we actually have. The suggestion doesn’t change our stock.” |
| 1:10–1:45 | Choose **Not cooking this** and open the Kitchen-linked surplus draft. Show the inherited food, amount and date type. Stop before publishing unless a donor has personally confirmed the food’s current quantity, condition, storage and pickup window. | “If we won’t use it, EcoLoop can prepare a sharing offer from the confirmed Kitchen record. The donor still reviews the real food and confirms it is suitable before publishing.” |
| 1:45–2:35 | Switch to the pre-authenticated NGO profile. Enter the request below, submit, and compare the two coverage/nearby options, route order, driving distance and time. Keep the rehearsal-only notice visible. | “An organization describes what it needs. Gemini extracts the constraints, EcoLoop matches confirmed quantities, and Google Routes estimates and orders each pickup loop using approximate locations. These records are clearly marked as rehearsal data.” |
| 2:35–2:50 | Keep the two route options and disabled rehearsal reservation action on screen. Do not switch to historical synthetic receipt records or suggest they represent real recovery. | “For a real offer, the organization can choose and reserve a plan, then record collection and receipt. Only a confirmed handover belongs in the recovery record.” |
| 2:50–2:58 | Show the architecture summary: Gemini, Firebase/Firestore, ADK managed Sessions, Google Routes; close on the product promise. | “EcoLoop connects buying smarter, using food in time, and sharing genuine surplus.” |

### NGO prompt

> Find vegetarian spinach for a community meal: 1,500 g total, within 5 km of our saved Bengaluru pickup base, pickup by 7:00 PM tomorrow. Show up to two plans, use the recorded quantities and pickup windows, and report any shortfall. Clearly mark rehearsal-only records and do not treat them as verified or reservable food.

The prompt requests weight, not a number of diners: the app must not invent a grams-per-person conversion. If the demo changes the request to a people count, provide an explicit serving assumption or show EcoLoop's clarification.

## Handoff gate

The current nearby search returns twelve synthetic records across six Bengaluru areas, all rehearsal-only; it returns zero operational donor-confirmed offers. Therefore a fully truthful recording can show offer review and route planning, but cannot show a new reservation, collection, receipt or impact event until a donor confirms an actual offer and the organization physically receives it. The code supports the operational lifecycle, but synthetic records are intentionally blocked from it. Do not seed a pretend “completed” pickup to make the video appear end-to-end.

## Verification notes

Report observed outcomes, not accuracy percentages. The current live candidate acceptance, account table, seed data and test prompt are linked from the [AI demo dataset](AI_DEMO_DATASET.md), [implementation status](STATUS.md) and [README](../README.md#demo-accounts). For this recording, verify the app link and exact-candidate release session before pressing Record.
