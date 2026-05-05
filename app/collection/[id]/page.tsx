import { ItemDetailClient } from "@/components/ItemDetailClient";

export default function ItemPage({ params }: { params: { id: string } }) {
  return <ItemDetailClient id={params.id} />;
}
