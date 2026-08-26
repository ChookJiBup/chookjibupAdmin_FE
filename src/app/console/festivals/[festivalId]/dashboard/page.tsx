import { FestivalOwnerGuard } from "@/components/auth/FestivalOwnerGuard";
import { DashboardPanel } from "@/features/dashboard/DashboardPanel";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <FestivalOwnerGuard festivalId={festivalId}>
      <DashboardPanel festivalId={festivalId} />
    </FestivalOwnerGuard>
  );
}
