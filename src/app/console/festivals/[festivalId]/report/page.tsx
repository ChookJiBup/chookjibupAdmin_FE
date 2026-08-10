import { ReportFlow } from "@/features/report/ReportFlow";

export default async function OperationReportPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="col-span-3 flex flex-col gap-4">
      <h1 className="heading-small">운영결과리포트 조회 (관리자·운영자) — {festivalId}</h1>
      <p className="body-small text-zinc-500">
        진행완료된 축제에 한해 확인 가능. 첫 진입 시 축제방문인원을 입력받으며, 건너뛰면 특정 결과는
        조회할 수 없다.
      </p>
      <ReportFlow festivalId={festivalId} />
    </div>
  );
}
