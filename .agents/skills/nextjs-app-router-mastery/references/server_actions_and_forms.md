# Server Actions & React 19 Form Hooks

## Using `useActionState` (React 19)

React 19 standardizes form state management with `useActionState`:

```tsx
"use client";

import { useActionState } from "react";
import { submitIntakeNoteAction, ParseResult } from "@/app/actions/intake";

const initialState: ParseResult = {
  success: false,
  message: "",
};

export function IntakeForm() {
  const [state, formAction, isPending] = useActionState(submitIntakeNoteAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <textarea
        name="noteText"
        placeholder="e.g. Dinner for 4 changed to dinner for 2..."
        required
        className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg disabled:opacity-50"
      >
        {isPending ? "Analyzing with Gemini..." : "Submit Plan Change"}
      </button>

      {state.message && (
        <p className={`text-sm ${state.success ? "text-emerald-400" : "text-rose-400"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```
