import { OfferDetail } from "@/components/features/offers/offer-detail";

export const metadata = {
  title: "Offering Details | EcoLoop",
  description: "View verified surplus offering details and quantity ledger.",
};

export default async function OfferDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ actorKind?: string; actorId?: string }>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const actorKind = search.actorKind === "business" || search.actorKind === "household" ? search.actorKind : undefined;
  const actorId = actorKind && search.actorId && search.actorId.length <= 128 ? search.actorId : undefined;
  return <OfferDetail key={`${actorKind ?? "household"}:${actorId ?? "selected"}:${id}`} offerId={id} actorKind={actorId ? actorKind : undefined} actorId={actorId} />;
}
