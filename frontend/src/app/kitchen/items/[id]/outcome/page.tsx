import { Suspense } from "react";
import { OutcomeItem } from "@/components/features/kitchen";

export default function OutcomeItemPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Loading item outcome…</div>}><OutcomeDetails params={params} /></Suspense>;
}

async function OutcomeDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OutcomeItem itemId={id} />;
}
