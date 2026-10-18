import { Suspense } from "react";
import { ItemDetail } from "@/components/features/kitchen";

export default function KitchenItemPage({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Loading item…</div>}><ItemDetails params={params} /></Suspense>;
}

async function ItemDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ItemDetail itemId={id} />;
}
