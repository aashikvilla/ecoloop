---
name: nextjs-app-router-mastery
description: >-
  Master Next.js 15+ App Router, React 19 Server Components, Server Actions, streaming,
  Partial Prerendering (PPR), accessible Tailwind design, and mobile-first layouts.
  Use when creating or refactoring pages, layouts, client/server components, or data-fetching layers in EcoLoop frontend.
---

# Next.js 15+ App Router Mastery Skill

This skill provides patterns and best practices for developing full-stack web applications using Next.js 15 App Router and React 19.

## Key Architecture Principles
1. **Server Components Default**: Maximizes security and eliminates client bundle overhead.
2. **Push Client Boundaries to the Leaves**: Only convert interactive UI elements to Client Components (`"use client"`).
3. **Type-Safe Server Actions**: Handle form mutations without building boilerplate API route handlers.
4. **Streaming with Suspense**: Stream slow backend operations while rendering shell UI instantly.

---

## 1. Directory Structure

```text
frontend/src/
├── app/
│   ├── layout.tsx         # Root layout with fonts & providers
│   ├── page.tsx           # Home / Landing page
│   ├── loading.tsx        # Global fallback shell
│   ├── error.tsx          # Error boundary ("use client")
│   ├── not-found.tsx      # 404 handler
│   ├── (dashboard)/       # Route groups
│   │   ├── household/
│   │   ├── kitchen/
│   │   └── recovery/
│   └── actions/           # Server actions ("use server")
├── components/            # Reusable UI components
│   ├── ui/                # Buttons, Cards, Badges, Modals
│   └── features/          # Domain-specific components
└── lib/                   # API clients, auth helpers, formatters
```

---

## 2. Server Action Pattern (`app/actions/intake.ts`)

```typescript
"use server";

import { revalidatePath } from "next/cache";

export interface ParseResult {
  success: boolean;
  message: string;
  candidates?: Array<{ name: string; quantity: number; unit: string }>;
}

export async function submitIntakeNoteAction(
  prevState: ParseResult | null,
  formData: FormData
): Promise<ParseResult> {
  const noteText = formData.get("noteText") as string;
  if (!noteText || noteText.trim().length < 3) {
    return { success: false, message: "Please enter a valid note." };
  }

  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/v1/intake/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: noteText, source: "text_note" }),
    });

    if (!res.ok) throw new Error("Failed to parse intake note");
    const data = await res.json();

    revalidatePath("/household");
    return { success: true, message: "Note parsed successfully", candidates: data.candidates };
  } catch (err: unknown) {
    return { success: false, message: (err as Error).message };
  }
}
```

---

## 3. References & Examples
- [Server vs Client Component Boundaries](./references/server_client_boundaries.md)
- [Server Actions and Form Handling](./references/server_actions_and_forms.md)
- [Server Action Template](./examples/server_action_template.ts)
- [Suspense Boundary Card](./examples/suspense_boundary_card.tsx)
