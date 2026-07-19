export default async function FestivalDetailPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div>
      <h1 className="text-lg font-semibold">축제 기본정보 조회/수정 (관리자) — {festivalId}</h1>
      <p className="text-sm text-gray-500">축제 삭제도 이 화면에서 처리</p>
    </div>
  );
}
