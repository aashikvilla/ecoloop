<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## EcoLoop frontend architecture

- Use `src/components/ui/` for app-wide primitives: `Button`, `Heading`, `Input`, `Card`, form controls, badges, dialogs and feedback. Keep APIs accessible, typed, small and reusable; screen-specific composition stays near its route or in `src/components/` feature folders.
- Use `src/components/layout/` for the four-destination shell, mobile navigation, desktop frame and responsive layout primitives. Do not duplicate global shell/navigation per page.
- Build mobile-first from the supplied Stitch screens, with 360px as the minimum acceptance width. Add wider breakpoints progressively; preserve ≥44px touch targets, labels, visible keyboard focus and loading/empty/error/pending/success/conflict states.
- Centralize color, typography, radius, spacing and elevation in `src/app/globals.css` using Tailwind v4 `@theme` variables. The project is on Tailwind v4, whose CSS-first theme configuration generates the utility tokens; do not create a conflicting legacy `tailwind.config` palette. Prefer semantic classes such as `bg-primary` over raw color literals. A theme change should normally require changing the token source once.
- Reuse the shared primitives on every destination. Add a primitive only when it expresses stable shared behavior or styling; avoid premature abstractions for one-use screen composition.
- Use Google Cloud/Gemini services for approved AI/product integrations. Never represent a mock as connected or introduce another provider without an explicit architecture decision.
- No frontend unit tests: do not create test files/frameworks or add unit-test dependencies. Allowed evidence includes lint/type/build checks when requested, integration/security checks, accessible manual review, cloud smoke checks and end-to-end user-journey acceptance.
