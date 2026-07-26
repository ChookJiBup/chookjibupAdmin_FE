import { OperatorsPanel } from "@/features/operators/OperatorsPanel";

export default async function OperatorManagePage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="heading-small">운영자 조회/등록/삭제 (관리자) — {festivalId}</h1>
      <p className="body-small text-zinc-500">
        사용자가 지정한 이는 해당 축제의 [운영자] 권한을 갖는다. (총괄관리자만 접근 가능 — 백엔드가
        권한을 검증한다)
      </p>
      <OperatorsPanel festivalId={festivalId} />
    </div>
  );
}
