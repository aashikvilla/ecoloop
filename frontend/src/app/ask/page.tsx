import { Suspense } from "react";
import { AskAssistant } from "@/components/features/ask";

export default function AskPage() {
  return <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted">Loading local assistant demo…</div>}><AskAssistant /></Suspense>;
}
