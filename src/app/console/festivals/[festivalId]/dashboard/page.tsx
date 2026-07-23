import { DashboardPanel } from "@/features/dashboard/DashboardPanel";

export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">실시간 운영 대시보드 (관리자·운영자) — {festivalId}</h1>
      <p className="body-small text-gray-500">축제부스맵 실시간 혼잡도, 축제 운영 AI 제안</p>
      <DashboardPanel festivalId={festivalId} />
    </div>
  );
}
