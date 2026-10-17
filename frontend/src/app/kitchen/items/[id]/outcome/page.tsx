import { Suspense } from "react";
import { OutcomeItem } from "@/components/features/kitchen";

export default function OutcomeItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ planId?: string; planTitle?: string }> }) {
  return <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Loading item outcome…</div>}><OutcomeDetails params={params} searchParams={searchParams} /></Suspense>;
}

async function OutcomeDetails({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ planId?: string; planTitle?: string }> }) {
  const { id } = await params;
  const { planId, planTitle } = await searchParams;
  return <OutcomeItem itemId={id} planId={planId} planTitle={planTitle} />;
}
