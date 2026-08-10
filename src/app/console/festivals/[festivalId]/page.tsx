import { FestivalDetailPanel } from "@/features/festivals/FestivalDetailPanel";

export default async function FestivalDetailPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <FestivalDetailPanel festivalId={festivalId} />;
}
