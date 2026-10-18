import { OffersList } from "@/components/features/offers/offers-list";

export const metadata = {
  title: "Surplus Food Offerings | EcoLoop",
  description: "Publish and track surplus food offerings for verified non-profit pickup.",
};

export default async function OffersPage({ searchParams }: { searchParams: Promise<{ actorKind?: string; actorId?: string }> }) {
  const search = await searchParams;
  const actorKind = search.actorKind === "business" || search.actorKind === "household" ? search.actorKind : undefined;
  const actorId = actorKind && search.actorId && search.actorId.length <= 128 ? search.actorId : undefined;
  return <OffersList requestedActorKind={actorId ? actorKind : undefined} requestedActorId={actorId} />;
}
