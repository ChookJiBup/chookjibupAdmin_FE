"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { updateFestivalProgressStatus } from "./api";
import type { ManagedFestivalDetail } from "./types";

type ProgressChoice = "AUTO" | "UPCOMING" | "ONGOING" | "COMPLETED";
const STATUS_LABELS: Record<ProgressChoice, string> = {
  AUTO: "날짜에 따라 자동 변경",
  UPCOMING: "진행 예정",
  ONGOING: "진행 중",
  COMPLETED: "종료",
};

export interface FestivalProgressControlProps {
  festival: ManagedFestivalDetail;
  disabled?: boolean;
}

/** 종료된 축제도 총괄관리자는 진행 상태를 다시 지정할 수 있다. */
export function FestivalProgressControl({ festival, disabled }: FestivalProgressControlProps) {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<ProgressChoice | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const savedChoice = festival.progressStatusOverride ?? "AUTO";
  const selected = choice ?? savedChoice;
  const mutation = useMutation({
    mutationFn: (next: ProgressChoice) =>
      updateFestivalProgressStatus(
        festival.festivalId,
        next === "AUTO" ? { automatic: true } : { automatic: false, progressStatus: next },
      ),
    onSuccess: async () => {
      setConfirmOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["managed-festivals"] }),
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[1] === festival.festivalId,
        }),
      ]);
      setChoice(null);
      toast.success("축제 진행 상태를 변경했습니다.");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "진행 상태 변경에 실패했습니다.")),
  });

  return (
    <section className="flex flex-col gap-2 rounded-md border border-zinc-300 p-4">
      <p className="body-small-bold text-zinc-950">
        진행 상태: {festival.progressStatus ? STATUS_LABELS[festival.progressStatus] : "미정"}
      </p>
      <p className="body-caption text-zinc-500">
        {savedChoice === "AUTO"
          ? "한국 날짜를 기준으로 시작일부터 종료일까지 진행 중으로 표시합니다."
          : "직접 지정한 상태입니다. 자동 변경으로 전환할 때까지 유지됩니다."}
      </p>
      {festival.role === "FESTIVAL_OWNER" && (
        <>
          <label htmlFor="festival-progress-choice" className="body-small-bold text-zinc-950">
            진행 상태 변경
          </label>
          <select
            id="festival-progress-choice"
            className="body-small w-full rounded-md border border-zinc-300 bg-white p-2 text-zinc-950"
            value={selected}
            disabled={disabled || mutation.isPending}
            onChange={(event) => setChoice(event.target.value as ProgressChoice)}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || mutation.isPending || selected === savedChoice}
            onClick={() => setConfirmOpen(true)}
          >
            상태 변경
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="진행 상태를 변경하시겠습니까?"
            description={
              mutation.isError
                ? getApiErrorMessage(mutation.error)
                : selected === "AUTO"
                  ? "저장된 축제 기간에 따라 상태가 다시 계산됩니다."
                  : `사용자에게 ‘${STATUS_LABELS[selected]}’ 상태로 표시됩니다. 자동 변경으로 전환할 때까지 유지됩니다.`
            }
            confirmLabel="변경"
            confirmVariant="primary"
            confirmPending={mutation.isPending}
            onConfirm={() => mutation.mutate(selected)}
          />
        </>
      )}
    </section>
  );
}
