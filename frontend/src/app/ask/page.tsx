import { Suspense } from "react";
import { AskAssistant } from "@/components/features/ask";

export default function AskPage() {
  return <Suspense fallback={<main className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted">Loading local assistant demo…</main>}><AskAssistant /></Suspense>;
}
