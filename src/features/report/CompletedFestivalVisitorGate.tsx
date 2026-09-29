"use client";

import { useQuery } from "@tanstack/react-query";
import { MissingVisitorCountDialog } from "@/features/dashboard/MissingVisitorCountDialog";
import { getManagedFestival } from "@/features/festivals/api";
import { getFestivalVisitorCounts } from "./api";
import { elapsedVisitorDays, missingPastVisitorDays } from "./visitorDays";

/**
 * 메인홈이 아니라 사용자가 선택한 축제 범위에 진입했을 때만 방문 인원을 확인한다.
 * 아직 시작하지 않은 축제와 입력 권한이 없는 운영자는 조회하지 않는다.
 */
export function CompletedFestivalVisitorGate({ festivalId }: { festivalId: string }) {
  const festivalQuery = useQuery({
    queryKey: ["managed-festival", festivalId],
    queryFn: () => getManagedFestival(festivalId),
  });
  const festival = festivalQuery.data;
  const shouldCheck =
    festival?.progressStatus !== "UPCOMING" && festival?.role === "FESTIVAL_OWNER";
  const countsQuery = useQuery({
    queryKey: ["festival-visitor-counts", festivalId],
    queryFn: () => getFestivalVisitorCounts(festivalId),
    enabled: shouldCheck,
    staleTime: 60_000,
    retry: false,
  });
  const missingDays = missingPastVisitorDays(countsQuery.data);
  if (!shouldCheck || missingDays.length === 0) return null;
  return (
    <MissingVisitorCountDialog
      festivalId={festivalId}
      festivalName={festival?.festivalName ?? undefined}
      days={elapsedVisitorDays(countsQuery.data)}
    />
  );
}
