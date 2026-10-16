import { Suspense } from "react";
import { ShareItem } from "@/components/features/kitchen";

export default function ShareItemPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Loading sharing record…</div>}><ShareDetails params={params} /></Suspense>;
}

async function ShareDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareItem itemId={id} />;
}
