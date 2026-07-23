"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getFestivalReportSummary } from "./api";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border px-4 py-3">
      <p className="body-small text-gray-500">{label}</p>
      <p className="heading-small">{value}</p>
    </div>
  );
}

export function ReportPanel({ festivalId }: { festivalId: string }) {
  const reportQuery = useQuery({
    queryKey: ["festival-report-summary", festivalId],
    queryFn: () => getFestivalReportSummary(festivalId),
  });

  if (reportQuery.isLoading) {
    return <p className="body-regular text-gray-500">불러오는 중...</p>;
  }

  if (reportQuery.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(reportQuery.error)}</p>;
  }

  const report = reportQuery.data;
  if (!report) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="총 방문자 수" value={report.totalVisitorCount.toLocaleString()} />
        <StatCard
          label="최대 동시 방문자 수"
          value={report.peakConcurrentVisitorCount.toLocaleString()}
        />
        <StatCard label="평균 대기 시간" value={`${report.averageWaitMinutes}분`} />
      </div>
      <p className="body-small text-gray-400">
        생성 시각: {new Date(report.generatedAt).toLocaleString("ko-KR")}
      </p>
      <p className="body-small text-gray-400">
        축제방문인원 수기 입력 기능은 백엔드 API가 아직 없어 이번 화면에 포함하지 않았습니다. 위 총
        방문자 수는 백엔드가 자동 집계한 값입니다.
      </p>
    </div>
  );
}
