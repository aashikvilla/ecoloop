import { ShareItem } from "@/components/features/kitchen";

export default async function ShareItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShareItem itemId={id} />;
}
