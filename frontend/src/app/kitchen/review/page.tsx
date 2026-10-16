import { Suspense } from "react";
import { ReviewFood } from "@/components/features/kitchen";

export default function ReviewFoodPage() {
  return <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Loading review draft…</div>}><ReviewFood /></Suspense>;
}
