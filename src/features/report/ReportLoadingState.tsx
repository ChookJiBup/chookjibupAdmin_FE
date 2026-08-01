"use client";

import { useEffect, useState } from "react";

const STEP_DURATION_MS = 1200;

export interface ReportLoadingStateProps {
  /** 진행률 텍스트에 쓰일 총 일수. */
  totalDays: number;
  onDone: () => void;
}

/**
 * 방문인원 제출 후 "분석 중" 상태를 보여주는 화면.
 * 실제로 서버에서 분석을 실행하는 API가 없어(운영결과리포트는 GET 요약 하나뿐),
 * 일자별 진행 텍스트만 흉내 내는 타이머다.
 */
export function ReportLoadingState({ totalDays, onDone }: ReportLoadingStateProps) {
  const [day, setDay] = useState(1);

  useEffect(() => {
    if (day > totalDays) {
      onDone();
      return;
    }
    const timer = setTimeout(() => setDay((current) => current + 1), STEP_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <p className="body-regular text-zinc-950">축제 결과를 분석하고 있어요</p>
      <div className="flex w-80 items-center gap-3">
        <div className="h-px flex-1 animate-pulse bg-zinc-300" />
        <p className="body-small shrink-0 text-zinc-500">{Math.min(day, totalDays)}일차 분석 중</p>
        <div className="h-px flex-1 animate-pulse bg-zinc-300" />
      </div>
    </div>
  );
}
