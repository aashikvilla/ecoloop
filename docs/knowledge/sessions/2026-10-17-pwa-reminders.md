# PWA installability and reminder readiness — 17 October 2026

## Result

- Added the app manifest, 192px and 512px PNG icons and Apple touch icon. Settings now offers the browser installation prompt when available and explains the browser-menu fallback otherwise.
- Settings says push/email reminder delivery is unavailable. It explains that confirmed Kitchen dates and last-check prompts can appear in Home/Kitchen while EcoLoop is open, and that installation or browser notification permission does not enable background delivery.
- Moved the desktop side rail breakpoint from 640px to 768px so the 640px layout keeps the mobile bottom navigation. The loading shell uses the same breakpoint.
- No service worker or browser storage was added. No household records are read or fabricated by the readiness UI.

## Verification

- Targeted ESLint passed for the changed app, Settings, install-readiness and shell files using the primary checkout's matching Next 16.4.1 dependency set.
- `git diff --check` passed.
- A direct TypeScript check was attempted but could not provide valid evidence: the interrupted worktree `npm ci` left `node_modules/next` incomplete, and TypeScript reported missing declarations for existing Next imports across the app. Two locked worktree installs stalled before creating local command shims; no production build was run.
- No unit tests or cloud operations were run.

## Decision

The initial PWA slice stops at installation metadata and browser install UI. Do not add offline caches until privacy-safe authenticated-data boundaries are defined. Push/email reminders require real FCM subscription plus backend delivery/scheduling before the UI can report them as available.
