"use client";

import { useQueries } from "@tanstack/react-query";
import { MissingVisitorCountDialog } from "@/features/dashboard/MissingVisitorCountDialog";
import type { FestivalSummary } from "@/features/home/types";
import { getFestivalVisitorCounts } from "./api";
import { elapsedVisitorDays, missingPastVisitorDays } from "./visitorDays";

/**
 * 한 번에 들여다볼 축제 수.
 *
 * 콘솔에 들어올 때마다 관리하는 축제 수만큼 조회가 나가므로 최근 것부터 잘라 본다.
 * 더 오래된 축제까지 밀려 있다면 이번 것을 채운 뒤 다음 것이 이어서 뜬다.
 */
const MAX_LOOKBACK = 10;

/**
 * 하루가 끝난 일차의 방문 인원이 비어 있으면 콘솔에 들어오자마자 채우게 한다.
 *
 * 처음에는 «끝난 축제»에만 걸었는데, 그러면 열흘짜리 축제의 1일차 인원을 열흘 뒤에
 * 기억으로 적게 된다. 사용자가 원한 것은 «하루 끝나고 다음 날 들어왔을 때» 묻고
 * 일차가 쌓여 가는 모양이라, 진행 중 축제까지 범위를 넓혔다.
 *
 * 아직 시작하지 않은(UPCOMING) 축제는 대상이 아니다 — 끝난 일차가 아예 없다.
 * 총괄관리자에게만 묻는다. 운영자는 입력 주체가 아니라 조회조차 하지 않는다.
 */
export function CompletedFestivalVisitorGate({ festivals }: { festivals: FestivalSummary[] }) {
  const targets = festivals
    .filter(
      (festival) => festival.progressStatus !== "UPCOMING" && festival.role === "FESTIVAL_OWNER",
    )
    // 최근 날짜일수록 기억에 남아 있어 채우기 쉽다. 그쪽부터 묻는다.
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, MAX_LOOKBACK);

  const results = useQueries({
    queries: targets.map((festival) => ({
      queryKey: ["festival-visitor-counts", festival.festivalId],
      queryFn: () => getFestivalVisitorCounts(festival.festivalId),
      /*
        콘솔 화면을 오갈 때마다 다시 묻지 않도록 잠시 묵혀 둔다. 저장하면 같은 키를
        무효화하므로(입력 모달) 채운 축제는 곧바로 목록에서 빠진다.
      */
      staleTime: 60_000,
      // 조회에 실패하면 게이트를 걸지 않는다. 무엇을 입력해야 하는지 모른 채 막으면 갇힌다.
      retry: false,
    })),
  });

  /*
    띄울지 말지는 «비어 있는 날»로 정하고, 보여 줄 목록은 «지나간 일차 전부»다.
    이미 채운 날도 값이 보여야 그날 것을 고치거나 총합을 확인할 수 있다.
  */
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
