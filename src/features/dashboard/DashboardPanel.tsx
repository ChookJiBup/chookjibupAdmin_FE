"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getFestivalDashboard } from "./api";

const OPERATING_STATUS_LABEL: Record<string, string> = {
  PREPARING: "준비중",
  RUNNING: "운영중",
  CLOSED: "종료",
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border px-4 py-3">
      <p className="body-small text-gray-500">{label}</p>
      <p className="heading-small">{value}</p>
    </div>
  );
}

export function DashboardPanel({ festivalId }: { festivalId: string }) {
  const dashboardQuery = useQuery({
    queryKey: ["festival-dashboard", festivalId],
    queryFn: () => getFestivalDashboard(festivalId),
    // 실시간 대시보드 성격상 주기적으로 새로고침한다. 갱신 주기는 백엔드와 협의 전이라 임시값이다.
    refetchInterval: 15000,
  });

  if (dashboardQuery.isLoading) {
    return <p className="body-regular text-gray-500">불러오는 중...</p>;
  }

  if (dashboardQuery.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(dashboardQuery.error)}</p>;
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="운영 상태"
          value={OPERATING_STATUS_LABEL[dashboard.operatingStatus] ?? dashboard.operatingStatus}
        />
        <StatCard label="현재 방문자 수" value={dashboard.currentVisitorCount.toLocaleString()} />
        <StatCard label="활성 대기열 수" value={dashboard.activeQueueCount.toLocaleString()} />
        <StatCard label="평균 대기 시간" value={`${dashboard.averageWaitMinutes}분`} />
      </div>
      <p className="body-small text-gray-400">
        마지막 갱신: {new Date(dashboard.updatedAt).toLocaleString("ko-KR")}
      </p>
      <p className="body-small text-gray-400">
        축제 운영 AI 제안은 백엔드 API가 아직 없어 이번 화면에 포함하지 않았습니다.
      </p>
    </div>
  );
}
