# Typed assistant cards implementation

## Scope

The Ask page now validates a scripted assistant envelope against the five fixed backend proposal shapes in `backend/app/schemas/household.py`: `MealSuggestion`, `PortionAdjustment`, `BuyCheck`, `FoodAction`, and `PreferenceConsent`. The preview is explicitly labeled local/scripted; no Gemini, ADK, API approval route, or household mutation is connected.

The runtime validator rejects unknown keys, wrong discriminants, unsupported enum values, invalid identifiers, excessive text/arrays, unsafe or non-finite quantities, invalid timezone dates, and duplicate proposal IDs. Invalid individual cards are omitted with an explanatory status. Text is rendered as React text; no model markup, URL, endpoint, or component name is interpreted. Stable discriminant mapping renders the five card components.

Cards show simulated, pending/version, and expired states; the renderer also has loading and error fallbacks. Actions stay visibly unavailable for approval. Review links use only fixed existing Kitchen, Shop, meal-plan, and consent anchors. Existing local meal-plan and preference consent flows remain separate and require explicit user action.

## Evidence

- `frontend/.\node_modules\.bin\tsc --noEmit` — passed.
- `frontend/npm run lint` — passed.
- `frontend/.\node_modules\.bin\next build --webpack` — passed; Next 16.4.1 compiled and generated all 13 static/partial-prerender routes.
- Default `npm run build` (Turbopack) — blocked by a worktree `node_modules` symlink resolution panic (`Symlink node_modules could not be resolved`). Webpack build succeeded using the same installed local package.
- No unit tests were added or run; no browser/end-to-end check was performed in this feature worktree.

## Limits

The envelope is a hard-coded local preview, not provider output. Approval remains unavailable until a canonical backend approval integration is configured. This work does not prove live provider behavior, household authorization, or a production assistant flow.
