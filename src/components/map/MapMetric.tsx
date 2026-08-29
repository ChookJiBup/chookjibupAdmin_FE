"use client";

import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface MapMetricProps {
  value: ReactNode;
  label: string;
  /** 라벨 옆 물음표 아이콘에 붙는 툴팁 문구. */
  description: string;
  valueClassName?: string;
  labelClassName?: string;
  className?: string;
}

/** 지도 화면 하단바에서 "값 + 라벨 + 도움말 툴팁" 한 칸을 렌더링한다. */
export function MapMetric({
  value,
  label,
  description,
  valueClassName = "body-regular",
  labelClassName = "body-small",
  className,
}: MapMetricProps) {
  return (
    <div className={cn("flex shrink-0 flex-col gap-1", className)}>
      <div className={cn("flex items-center text-zinc-950", valueClassName)}>{value}</div>
      <div className={cn("flex items-center gap-1 text-zinc-500", labelClassName)}>
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger aria-label={`${label} 도움말`}>
            <QuestionMarkCircledIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
