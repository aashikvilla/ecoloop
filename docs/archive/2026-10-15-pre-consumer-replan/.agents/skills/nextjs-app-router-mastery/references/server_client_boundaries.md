# Server vs Client Component Boundaries in Next.js 15

## Decision Matrix

| Requirement | Component Type | Reason |
|---|---|---|
| Fetch initial data from FastAPI or Firestore | **Server Component** | Keeps secrets hidden; zero client bundle size |
| Render static HTML layout, headers, footers | **Server Component** | Optimal SEO, fast first contentful paint (FCP) |
| Accordion toggle, modal popup, dropdown | **Client Component** | Needs `useState` and DOM click listeners |
| Live backend connectivity polling / WebSocket | **Client Component** | Needs `useEffect` or browser timers |
| Drag-and-drop receipt uploader | **Client Component** | Needs HTML5 File API and drag events |

## Interleaving Pattern (Passing Server Components as Children)

Never import a Server Component directly into a Client Component. Instead, pass it as a `children` prop:

```tsx
// InteractiveModal.tsx ("use client")
"use client";
import { useState } from "react";

export function InteractiveModal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setIsOpen(true)}>Open Details</button>
      {isOpen && <div className="modal">{children}</div>}
    </div>
  );
}

// Page.tsx (Server Component)
import { InteractiveModal } from "./InteractiveModal";
import { ServerFetchedDetails } from "./ServerFetchedDetails";

export default async function Page() {
  return (
    <InteractiveModal>
      {/* ServerFetchedDetails executes on the server! */}
      <ServerFetchedDetails />
    </InteractiveModal>
  );
}
```
