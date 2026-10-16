# Stitch frontend

Server Components default, focused interactive leaves. Home/Kitchen/Ask/Shop plus shared flows. Follow actual household PNG/HTML and STITCH_AUDIT over conflicting DESIGN.md prose. Warm light tokens; no dark operator dashboard. 360px layouts, 44px targets, keyboard/focus/labels and contrast review. Loading/empty/error/success/pending/conflict/retry. Five typed cards; no arbitrary model markup/endpoints.

Scope: docs/planning/CURRENT_MVP_SPEC.md. Task acceptance and execution order: docs/planning/IMPLEMENTATION_PLAN.md.

Shared implementation: `frontend/src/components/ui/` owns Button, Heading, Input, Card and other app-wide primitives; `frontend/src/components/layout/` owns the four-tab shell and responsive frame. Screen-specific composition belongs to its route/feature. Prefer reuse over duplicating primitives.

Tailwind v4 is configured CSS-first: centralize design tokens in `frontend/src/app/globals.css` with `@theme`, then use semantic utilities throughout. Do not maintain duplicate raw palettes or a competing legacy `tailwind.config` theme. Follow mobile-first layouts from 360px, with ≥44px controls and keyboard/focus/accessibility states.

No frontend unit tests or unit-test dependencies. Use approved lint/type/build checks, integration/security checks, manual accessibility checks and end-to-end journey acceptance instead. Never claim these forms of verification passed unless run and evidenced.
