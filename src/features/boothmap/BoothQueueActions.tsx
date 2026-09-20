"use client";

import { Button } from "@/components/ui/Button";

/**
 * 부스 말풍선 아래에 붙는 대기줄 요약과 진입 버튼.
 *
 * 준비 단계의 사전 경로와 현장 운영 단계의 줄 기록을 나눠 보여 준다.
 */
export function BoothQueueActions({
  boothName,
  planSummary,
  waitMinutes,
  planDisabledReason,
  currentDisabledReason,
  onPlanAi,
  onPlanManual,
  onCurrent,
}: {
  boothName: string;
  /** 저장된 사전 줄 요약. 없으면 미설정으로 표시한다. */
  planSummary?: string;
  waitMinutes?: number | null;
  planDisabledReason?: string;
  currentDisabledReason?: string;
  onPlanAi: () => void;
  onPlanManual: () => void;
  onCurrent: () => void;
}) {
  return (
    <section aria-label={`${boothName} 줄 관리`} data-map-tools className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="body-small-bold text-zinc-950">대기 줄</span>
        <span className="body-small truncate text-zinc-950">
          {planSummary ?? "미설정"}
          {waitMinutes != null ? (
            <span className="body-small-bold ml-1 text-primary">· {waitMinutes}분</span>
          ) : null}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={Boolean(planDisabledReason)}
            onClick={onPlanAi}
          >
            AI 추천
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={Boolean(planDisabledReason)}
            onClick={onPlanManual}
          >
            줄 직접 설정
          </Button>
        </div>
        {planDisabledReason ? (
          <p className="body-caption text-zinc-500">{planDisabledReason}</p>
        ) : null}
        <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
          <span className="body-caption text-zinc-500">현장 운영</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={Boolean(currentDisabledReason)}
            onClick={onCurrent}
          >
            줄끝 갱신
          </Button>
        </div>
        {currentDisabledReason ? (
          <p className="body-caption text-zinc-500">{currentDisabledReason}</p>
        ) : null}
      </div>
    </section>
  );
}
