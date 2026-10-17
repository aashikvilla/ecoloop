"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { CreateOfferWizard } from "@/components/features/offers/create-offer-wizard";

export default function EditOfferPage() {
  return <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted">Loading offer form…</div>}><EditOfferForm /></Suspense>;
}

function EditOfferForm() {
  const params = useParams<{ id: string }>();
  return <CreateOfferWizard editOfferId={params.id} />;
}
