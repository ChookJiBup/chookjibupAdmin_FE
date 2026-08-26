import { FestivalOwnerGuard } from "@/components/auth/FestivalOwnerGuard";
import { FestivalDetailPanel } from "@/features/festivals/FestivalDetailPanel";

export default async function FestivalDetailPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <FestivalOwnerGuard festivalId={festivalId}>
      <FestivalDetailPanel festivalId={festivalId} />
    </FestivalOwnerGuard>
  );
}
