import { ItemDetail } from "@/components/features/kitchen";

export default async function KitchenItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ItemDetail itemId={id} />;
}
