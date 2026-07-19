export default async function FestivalDashboardPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div>
      <h1 className="text-lg font-semibold">실시간 운영 대시보드 (관리자·운영자) — {festivalId}</h1>
      <p className="text-sm text-gray-500">축제부스맵 실시간 혼잡도, 축제 운영 AI 제안</p>
    </div>
  );
}
