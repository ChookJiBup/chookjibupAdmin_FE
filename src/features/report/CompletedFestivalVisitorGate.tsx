"use client";

import { useQueries } from "@tanstack/react-query";
import { MissingVisitorCountDialog } from "@/features/dashboard/MissingVisitorCountDialog";
import type { FestivalSummary } from "@/features/home/types";
import { getFestivalVisitorCounts } from "./api";
import { elapsedVisitorDays, missingPastVisitorDays } from "./visitorDays";

const MAX_LOOKBACK = 10;

/** 지나간 축제 일차의 방문 인원이 비어 있으면 홈에서 입력을 안내한다. */
export function CompletedFestivalVisitorGate({ festivals }: { festivals: FestivalSummary[] }) {
  const targets = festivals
    .filter(
      (festival) => festival.progressStatus !== "UPCOMING" && festival.role === "FESTIVAL_OWNER",
    )
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, MAX_LOOKBACK);

  const results = useQueries({
    queries: targets.map((festival) => ({
      queryKey: ["festival-visitor-counts", festival.festivalId],
      queryFn: () => getFestivalVisitorCounts(festival.festivalId),
      staleTime: 60_000,
      retry: false,
    })),
  });

  const pending = targets
    .map((festival, index) => ({
      festival,
      days: elapsedVisitorDays(results[index]?.data),
      missingDays: missingPastVisitorDays(results[index]?.data),
    }))
    .find(({ missingDays }) => missingDays.length > 0);

  if (!pending) return null;
  return (
    <MissingVisitorCountDialog
      key={pending.festival.festivalId}
      festivalId={pending.festival.festivalId}
      festivalName={pending.festival.festivalName}
      days={pending.days}
    />
  );
}
