import { DashboardPanel } from "@/features/dashboard/DashboardPanel";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="heading-small">대시보드</h1>
      <DashboardPanel festivalId={festivalId} />
    </div>
  );
}
