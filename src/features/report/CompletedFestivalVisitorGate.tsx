"use client";

import { useQueries } from "@tanstack/react-query";
import { MissingVisitorCountDialog } from "@/features/dashboard/MissingVisitorCountDialog";
import type { FestivalSummary } from "@/features/home/types";
import { getFestivalVisitorCounts } from "./api";
import { missingPastVisitorDays } from "./visitorDays";

/**
 * 한 번에 들여다볼 «끝난 축제» 수.
 *
 * 로그인할 때마다 관리하는 축제 수만큼 조회가 나가므로 최근에 끝난 것부터 잘라 본다.
 * 더 오래된 축제까지 밀려 있다면 이번 것을 채운 뒤 다음 것이 이어서 뜬다.
 */
const MAX_LOOKBACK = 10;

/**
 * 끝난 축제의 방문 인원이 비어 있으면 콘솔에 들어오자마자 채우게 한다.
 *
 * 예전에는 이 물음이 대시보드에만 있어서, 축제가 끝난 줄 모르고 지나가면 아무도
 * 묻지 않았다. 「진행 완료」 탭에서 그 축제를 일부러 눌러 들어가야 비로소 떴다.
 * 방문 인원은 하루가 지나면 되짚어 세기 어렵고 결과리포트의 근거라, 축제가 끝난
 * 사실을 먼저 알리고 그 자리에서 받는다.
 *
 * 총괄관리자에게만 묻는다. 운영자는 입력 주체가 아니라 조회조차 하지 않는다.
 */
export function CompletedFestivalVisitorGate({ festivals }: { festivals: FestivalSummary[] }) {
  const targets = festivals
    .filter(
      (festival) => festival.progressStatus === "COMPLETED" && festival.role === "FESTIVAL_OWNER",
    )
    // 최근에 끝난 축제가 기억에 남아 있어 채우기 쉽다. 그쪽부터 묻는다.
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

  const pending = targets
    .map((festival, index) => ({
      festival,
      missingDays: missingPastVisitorDays(results[index]?.data),
    }))
    .find(({ missingDays }) => missingDays.length > 0);

  if (!pending) return null;
  return (
    <MissingVisitorCountDialog
      key={pending.festival.festivalId}
      festivalId={pending.festival.festivalId}
      festivalName={pending.festival.festivalName}
      missingDays={pending.missingDays}
    />
  );
}
