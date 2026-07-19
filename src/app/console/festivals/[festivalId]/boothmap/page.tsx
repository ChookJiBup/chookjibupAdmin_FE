export default async function BoothMapEditPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div>
      <h1 className="text-lg font-semibold">축제 부스맵 수정 (관리자) — {festivalId}</h1>
    </div>
  );
}
