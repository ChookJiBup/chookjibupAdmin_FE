"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FestivalVisitorDay } from "./types";

export interface VisitorCountFormProps {
  /** 백엔드가 반환한 축제 기간별 방문 인원 입력 상태 */
  days: FestivalVisitorDay[];
  isPending?: boolean;
  onSubmit: (counts: number[]) => void;
}

export function VisitorCountForm({ days, isPending, onSubmit }: VisitorCountFormProps) {
  const [dailyCounts, setDailyCounts] = useState<string[]>(
    days.map((day) => day.visitorCount?.toString() ?? ""),
  );

  const dailyValid = dailyCounts.every((value) => value.trim() !== "" && Number(value) >= 0);
  const dailyTotal = dailyCounts.reduce((sum, value) => sum + (Number(value) || 0), 0);

  function numbersOnly(value: string) {
    return value.replace(/\D/g, "");
  }

  function handleSubmit() {
    if (!dailyValid) return;
    onSubmit(dailyCounts.map(Number));
  }

  return (
    <div className="w-[480px] overflow-hidden rounded-2xl border border-zinc-300 bg-white">
      <div className="flex items-center justify-center gap-1.5 px-8 py-4">
        <h2 className="heading-small text-center text-zinc-950">축제 방문 인원</h2>
        <Tooltip>
          <TooltipTrigger aria-label="도움말">
            <InfoCircledIcon className="size-4 text-zinc-400" />
          </TooltipTrigger>
          <TooltipContent>방문인원을 입력하면 축제성과를 분석할 수 있어요.</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-6 border-t border-zinc-200 p-8">
        <div className="flex flex-col gap-5">
          {dailyCounts.map((value, index) => (
            <Input
              key={days[index].visitDate}
              label={`${days[index].dayIndex}일차`}
              disabled={!days[index].inputAllowed}
              inputMode="numeric"
              placeholder="방문인원을 입력해 주세요"
              value={value ? Number(value).toLocaleString() : ""}
              onChange={(event) => {
                const next = [...dailyCounts];
                next[index] = numbersOnly(event.target.value);
                setDailyCounts(next);
              }}
            />
          ))}
          <Input
            label="총합"
            disabled
            placeholder="자동 계산"
            value={dailyValid ? dailyTotal.toLocaleString() : ""}
          />
        </div>

        <div>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!dailyValid || isPending}
            onClick={handleSubmit}
          >
            {isPending ? "저장 중..." : "입력하기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
