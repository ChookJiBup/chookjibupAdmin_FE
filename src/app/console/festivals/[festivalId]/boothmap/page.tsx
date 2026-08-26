import { FestivalOwnerGuard } from "@/components/auth/FestivalOwnerGuard";
import { BoothMapUploadPanel } from "@/features/boothmap/BoothMapUploadPanel";

export default async function BoothMapEditPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <FestivalOwnerGuard festivalId={festivalId}>
      <BoothMapUploadPanel key={festivalId} festivalId={festivalId} />
    </FestivalOwnerGuard>
  );
}
