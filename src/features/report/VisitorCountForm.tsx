"use client";

import { InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface VisitorCountFormProps {
  /**
   * 일자별 입력 행 수. 축제 단건 조회 API가 아직 없어 축제 실제 기간을
   * 알 수 없으므로, 호출부에서 임시 고정값을 전달한다.
   */
  dayCount: number;
  onSkip: () => void;
  onSubmit: (totalVisitorCount: number) => void;
}

export function VisitorCountForm({ dayCount, onSkip, onSubmit }: VisitorCountFormProps) {
  const [tab, setTab] = useState<"daily" | "aggregate">("daily");
  const [dailyCounts, setDailyCounts] = useState<string[]>(Array(dayCount).fill(""));
  const [aggregateCount, setAggregateCount] = useState("");

  const dailyValid = dailyCounts.every((value) => value.trim() !== "" && Number(value) >= 0);
  const dailyTotal = dailyCounts.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const aggregateValid = aggregateCount.trim() !== "" && Number(aggregateCount) >= 0;

  const canSubmit = tab === "daily" ? dailyValid : aggregateValid;

  function numbersOnly(value: string) {
    return value.replace(/\D/g, "");
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(tab === "daily" ? dailyTotal : Number(aggregateCount));
  }

  const tooltipText =
    tab === "daily"
      ? "방문인원을 입력하면 축제성과를 분석할 수 있어요."
      : "일자별로 입력하면 축제성과를 정확하게 분석할 수 있어요.";

  return (
    <div className="w-[480px] overflow-hidden rounded-2xl border border-zinc-300 bg-white">
      <div className="flex items-center justify-center gap-1.5 px-8 py-4">
        <h2 className="heading-small text-center text-zinc-950">축제 방문 인원</h2>
        <Tooltip>
          <TooltipTrigger aria-label="도움말">
            <InfoCircledIcon className="size-4 text-zinc-400" />
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-6 border-t border-zinc-200 p-8">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "daily" | "aggregate")}
          className="gap-6"
        >
          <TabsList className="h-12 w-full">
            <TabsTrigger value="daily" className="body-regular h-10">
              일자별 입력
            </TabsTrigger>
            <TabsTrigger value="aggregate" className="body-regular h-10">
              총합 입력
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="flex flex-col gap-5">
            {dailyCounts.map((value, index) => (
              <Input
                key={index}
                label={`${index + 1}일차`}
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
          </TabsContent>

          <TabsContent value="aggregate">
            <Input
              label="총합"
              inputMode="numeric"
              placeholder="인원을 입력해 주세요"
              value={aggregateCount ? Number(aggregateCount).toLocaleString() : ""}
              onChange={(event) => setAggregateCount(numbersOnly(event.target.value))}
            />
          </TabsContent>
        </Tabs>

        <div className="flex gap-3">
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onSkip}>
            건너뛰기
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            입력하기
          </Button>
        </div>
      </div>
    </div>
  );
}
