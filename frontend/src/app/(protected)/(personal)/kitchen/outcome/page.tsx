import { Suspense } from "react";
import { OutcomeItem } from "@/components/features/kitchen";

export default async function SelectOutcomeItemPage({ searchParams }: { searchParams: Promise<{ planId?: string }> }) {
  const { planId } = await searchParams;
  return <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Loading outcome form…</div>}><OutcomeItem planId={planId} /></Suspense>;
}
