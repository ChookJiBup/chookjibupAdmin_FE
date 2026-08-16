"use client";

import { useEffect, useState } from "react";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { ReportLoadingState } from "./ReportLoadingState";
import { ReportPanel } from "./ReportPanel";
import { VisitorCountForm } from "./VisitorCountForm";

// 축제 단건 조회 API가 아직 없어 실제 축제 기간을 알 수 없다. 그 값이 생기면
// 실제 일수로 교체한다.
const FESTIVAL_DAY_COUNT = 2;

function reportFlowStorageKey(festivalId: string) {
  return `chookjibup-report-flow-${festivalId}`;
}

type Step = "form" | "loading" | "done";

/**
 * "방문인원 입력(9) → 분석 중(9-1) → 결과 리포트" 흐름을 관리한다.
 * 방문인원을 입력받는 서버 API가 없어(리포트는 GET 요약 하나뿐), 입력/건너뛰기
 * 결과는 어디에도 전송하지 않고 이 브라우저에 "한 번 봤다"는 표시만 남긴다.
 */
export function ReportFlow({ festivalId }: { festivalId: string }) {
  const [step, setStep] = useState<Step>(() => {
    if (typeof window === "undefined") return "form";
    return window.localStorage.getItem(reportFlowStorageKey(festivalId)) ? "done" : "form";
  });
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);

  // 방문인원 입력/분석 중 화면에서는 Nav 탭 줄을 숨긴다(디자인 스펙).
  useEffect(() => {
    setHideNav(step !== "done");
    return () => setHideNav(false);
  }, [step, setHideNav]);

  function markHandled() {
    window.localStorage.setItem(reportFlowStorageKey(festivalId), "1");
  }

  if (step === "form") {
    return (
      <div className="fixed inset-x-0 top-[72px] bottom-0 z-10 flex items-center justify-center bg-dimmed p-8">
        <VisitorCountForm
          dayCount={FESTIVAL_DAY_COUNT}
          onSkip={() => {
            markHandled();
            setStep("loading");
          }}
          onSubmit={() => {
            markHandled();
            setStep("loading");
          }}
        />
      </div>
    );
  }

  if (step === "loading") {
    return (
      <div className="fixed inset-x-0 top-[72px] bottom-0 z-10 bg-white">
        <ReportLoadingState totalDays={FESTIVAL_DAY_COUNT} onDone={() => setStep("done")} />
      </div>
    );
  }

  return (
    <div className="col-span-3">
      <ReportPanel festivalId={festivalId} />
    </div>
  );
}
