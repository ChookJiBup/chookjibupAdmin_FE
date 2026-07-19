export default async function StaffManagePage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div>
      <h1 className="text-lg font-semibold">스태프 조회/등록/삭제 (관리자·운영자) — {festivalId}</h1>
    </div>
  );
}
