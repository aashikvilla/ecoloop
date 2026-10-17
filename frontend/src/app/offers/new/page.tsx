import { Suspense } from "react";
import { CreateOfferWizard } from "@/components/features/offers/create-offer-wizard";

export const metadata = {
  title: "Create Surplus Offering | EcoLoop",
  description: "Create and publish surplus food offers with verified donor declarations.",
};

export default function NewOfferPage() {
  return <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-10 text-sm text-muted">Loading offer form…</div>}><CreateOfferWizard /></Suspense>;
}
