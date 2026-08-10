import { DashboardPanel } from "@/features/dashboard/DashboardPanel";

export default async function OperatorDashboardPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <DashboardPanel festivalId={festivalId} />;
}
