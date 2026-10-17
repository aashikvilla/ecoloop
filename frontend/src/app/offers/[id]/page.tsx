import { OfferDetail } from "@/components/features/offers/offer-detail";

export const metadata = {
  title: "Offering Details | EcoLoop",
  description: "View verified surplus offering details and quantity ledger.",
};

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfferDetail offerId={id} />;
}
