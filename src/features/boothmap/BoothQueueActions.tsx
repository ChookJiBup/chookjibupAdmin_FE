"use client";

import { Button } from "@/components/ui/Button";

/**
 * 부스 말풍선 아래에 붙는 대기줄 요약과 진입 버튼.
 *
 * 사전 경로를 먼저 정해야 현재 줄을 기록할 수 있어서 버튼 두 개만 나란히 두고,
 * 막혀 있는 이유는 가장 먼저 풀어야 할 한 가지만 보여 준다.
 */
export function BoothQueueActions({
  boothName,
  planSummary,
  waitMinutes,
  planDisabledReason,
  currentDisabledReason,
  onPlan,
  onCurrent,
  planExists = false,
  currentExists = false,
}: {
  boothName: string;
  /** 저장된 사전 줄 요약. 없으면 미설정으로 표시한다. */
  planSummary?: string;
  waitMinutes?: number | null;
  planDisabledReason?: string;
  currentDisabledReason?: string;
  onPlan: () => void;
  onCurrent: () => void;
  planExists?: boolean;
  currentExists?: boolean;
}) {
  const disabledReason = planDisabledReason ?? currentDisabledReason;
  return (
    <section aria-label={`${boothName} 줄 관리`} data-map-tools className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="body-small text-zinc-500">대기줄</span>
        <span className="body-small truncate text-zinc-950">
          {planSummary ?? "미설정"}
          {waitMinutes != null ? (
            <span className="body-small-bold ml-1 text-primary">· {waitMinutes}분</span>
          ) : null}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={Boolean(planDisabledReason)}
          onClick={onPlan}
        >
          {planExists ? "사전 줄 수정" : "줄 직접 설정"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={Boolean(currentDisabledReason)}
          onClick={onCurrent}
        >
          {currentExists ? "현재 줄 수정" : "현재 줄 기록"}
        </Button>
      </div>
      {disabledReason ? <p className="body-caption text-zinc-500">{disabledReason}</p> : null}
    </section>
  );
}
