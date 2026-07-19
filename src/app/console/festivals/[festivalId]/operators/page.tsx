export default async function OperatorManagePage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div>
      <h1 className="text-lg font-semibold">운영자 조회/등록/삭제 (관리자) — {festivalId}</h1>
      <p className="text-sm text-gray-500">
        사용자가 지정한 이는 해당 축제의 [운영자] 권한을 갖는다.
      </p>
    </div>
  );
}
