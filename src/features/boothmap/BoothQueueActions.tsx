"use client";

import { Button } from "@/components/ui/Button";

export function BoothQueueActions({
  boothName,
  planDisabledReason,
  currentDisabledReason,
  aiDisabledReason,
  onPlan,
  onAi,
  onCurrent,
  planExists = false,
  currentExists = false,
}: {
  boothName: string;
  planDisabledReason?: string;
  currentDisabledReason?: string;
  aiDisabledReason?: string;
  onPlan: () => void;
  onAi: () => void;
  onCurrent: () => void;
  planExists?: boolean;
  currentExists?: boolean;
}) {
  return (
    <section aria-label={`${boothName} 줄 관리`} data-map-tools className="space-y-2">
      <p className="body-small-bold text-zinc-950">{boothName} · 줄 관리</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={Boolean(planDisabledReason)} onClick={onPlan}>
          {planExists ? "사전 줄 수정" : "줄 직접 설정"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(aiDisabledReason ?? planDisabledReason)}
          onClick={onAi}
        >
          AI 줄 설정
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={Boolean(currentDisabledReason)}
          onClick={onCurrent}
        >
          {currentExists ? "현재 줄 수정" : "현재 줄 기록"}
        </Button>
      </div>
      <p className="body-caption text-zinc-500">
        {planDisabledReason ?? "사전 경로를 설정한 뒤 현재 줄을 기록하면 대기시간이 계산됩니다."}
      </p>
      {aiDisabledReason && !planDisabledReason ? (
        <p className="body-caption text-zinc-500">{aiDisabledReason}</p>
      ) : null}
      {currentDisabledReason && currentDisabledReason !== planDisabledReason ? (
        <p className="body-caption text-zinc-500">현재 줄: {currentDisabledReason}</p>
      ) : null}
    </section>
  );
}
