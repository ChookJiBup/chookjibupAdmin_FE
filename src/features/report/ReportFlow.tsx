"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import {
  generateFestivalReport,
  getFestivalReportStatus,
  getFestivalVisitorCounts,
  updateDailyVisitorCount,
} from "./api";
import { ReportPanel } from "./ReportPanel";
import { VisitorCountForm } from "./VisitorCountForm";

export function ReportFlow({ festivalId }: { festivalId: string }) {
  const queryClient = useQueryClient();
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);
  const visitorsQuery = useQuery({
    queryKey: ["festival-visitor-counts", festivalId],
    queryFn: () => getFestivalVisitorCounts(festivalId),
  });
  const statusQuery = useQuery({
    queryKey: ["festival-report-status", festivalId],
    queryFn: () => getFestivalReportStatus(festivalId),
    refetchInterval: (query) =>
      ["PENDING", "PROCESSING"].includes(query.state.data?.generationStatus ?? "") ? 1500 : false,
  });
  const generationStatus = statusQuery.data?.generationStatus;
  const isGenerating = generationStatus === "PENDING" || generationStatus === "PROCESSING";
  const showForm = generationStatus !== "COMPLETED" && !isGenerating;

  useEffect(() => {
    setHideNav(showForm || isGenerating);
    return () => setHideNav(false);
  }, [isGenerating, setHideNav, showForm]);

  const submitMutation = useMutation({
    mutationFn: async (counts: number[]) => {
      const days = visitorsQuery.data?.days ?? [];
      await Promise.all(
        days.map((day, index) => updateDailyVisitorCount(festivalId, day.visitDate, counts[index])),
      );
      await generateFestivalReport(festivalId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["festival-visitor-counts", festivalId] }),
        queryClient.invalidateQueries({ queryKey: ["festival-report-status", festivalId] }),
      ]);
    },
  });

  if (visitorsQuery.isLoading || statusQuery.isLoading)
    return <p className="body-regular col-span-3 text-zinc-500">불러오는 중...</p>;
  const error = visitorsQuery.error ?? statusQuery.error ?? submitMutation.error;
  if (error) return <p className="body-small col-span-3 text-error">{getApiErrorMessage(error)}</p>;

  if (showForm && visitorsQuery.data) {
    return (
      <div className="fixed inset-x-0 top-[72px] bottom-0 z-10 flex items-center justify-center bg-dimmed p-8">
        <VisitorCountForm
          days={visitorsQuery.data.days}
          isPending={submitMutation.isPending}
          onSubmit={(counts) => submitMutation.mutate(counts)}
        />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="fixed inset-x-0 top-[72px] bottom-0 z-10 flex flex-col items-center justify-center gap-4 bg-white">
        <p className="body-regular text-zinc-950">
          {statusQuery.data?.progressMessage ?? "축제 결과를 분석하고 있어요"}
        </p>
        {statusQuery.data?.progressDayIndex ? (
          <p className="body-small text-zinc-500">
            {statusQuery.data.progressDayIndex}일차 분석 중
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="col-span-3">
      <ReportPanel festivalId={festivalId} />
    </div>
  );
}
