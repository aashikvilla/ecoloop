# Next.js 15+ & React 19 Architecture Rules

> **Scope**: `frontend/` directory.  
> **Guiding Principle**: Maximize server execution, minimize client JavaScript bundle size, and build accessible, responsive user interfaces.

---

## 1. Server Components vs. Client Components

1. **Server Components by Default**:
   - Every component in `app/` is a React Server Component (RSC) unless marked with `"use client"`.
   - Perform data fetching, database access, and heavy computations on the server.
   - Keep secrets, API tokens, and server URLs strictly on the server.

2. **When to Use `"use client"`**:
   - Only when utilizing React browser state (`useState`, `useReducer`, `useEffect`).
   - When listening to browser DOM events (`onClick`, `onChange`, `onSubmit`).
   - When using custom browser APIs (`localStorage`, `window`, `geolocation`).
   - Push `"use client"` directives as far down the component tree as possible (leaf components).

3. **Boundary Isolation**:
   - Never import server-only code into client components. Use `import "server-only";` in server utility modules to catch accidental imports at build time.
   - Pass data from Server Components to Client Components via serializable props.

---

## 2. Server Actions & Mutations

1. **Colocated Server Actions**:
   - Declare server mutations with `"use server"`.
   - Always validate action arguments using strict schemas (e.g. Zod or typed DTOs).
   - Verify caller authentication and session tokens before performing mutations.

2. **Optimistic Updates & Progressive Enhancement**:
   - Use React 19 hooks (`useActionState`, `useOptimistic`) for instant UI feedback during network operations.
   - Ensure basic form submissions function without client-side JavaScript where possible.

---

## 3. Streaming, Suspense & Partial Prerendering (PPR)

1. **Granular Suspense Boundaries**:
   - Wrap slow or dynamic data-fetching sections in `<Suspense fallback={<CardSkeleton />}>`.
   - Never block whole page navigation on secondary data streams (e.g. historical outcome charts).

2. **Route Special Files**:
   - Utilize standard App Router conventions:
     - `loading.tsx` for instant navigation states.
     - `error.tsx` for component subtree error recovery (must be `"use client"`).
     - `not-found.tsx` for clean 404 handlers.

---

## 4. UI & Styling Rules (Tailwind CSS v4)

1. **Design System & Semantic Tokens**:
   - Use semantic color tokens: `emerald-*` for circular/verified flows, `amber-*` for pending review, `rose-*` for safety violations/spoilage.
   - Dark-mode first design palette (`bg-slate-950`, `text-slate-100`, `border-slate-800`).

2. **Mobile-First Responsiveness**:
   - Must render seamlessly down to **360px** viewport width without horizontal scrollbars.
   - Use fluid responsive grid utilities (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).

3. **Accessibility (a11y)**:
   - Ensure minimum contrast ratio of 4.5:1 for standard text.
   - All interactive controls must possess descriptive `aria-label` or visible text labels.
   - Visible keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-emerald-400`).
