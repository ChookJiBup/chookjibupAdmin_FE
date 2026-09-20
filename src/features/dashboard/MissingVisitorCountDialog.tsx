"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DIALOG_OVERLAY_CLASSES } from "@/components/ui/dialogOverlay";
import { Input } from "@/components/ui/Input";
import { toDisplayDate } from "@/features/festivals/dateFormat";
import { updateDailyVisitorCount } from "@/features/report/api";
import type { FestivalVisitorDay } from "@/features/report/types";
import { getApiErrorMessage } from "@/lib/api/httpError";

export interface MissingVisitorCountDialogProps {
  festivalId: string;
  /** 지나간 날 중 방문 인원이 비어 있는 날들. 비어 있으면 이 모달은 뜨지 않는다. */
  missingDays: FestivalVisitorDay[];
  /**
   * 끝난 축제를 대신 물을 때 그 축제 이름.
   *
   * 대시보드에서 뜰 때는 지금 보고 있는 축제라 이름이 필요 없지만, 로그인 직후
   * 콘솔 첫 화면에서 뜰 때는 어느 축제 이야기인지 밝히지 않으면 알 수 없다.
   */
  festivalName?: string;
}

/**
 * 지나간 날짜의 방문 인원이 비어 있는 동안 대시보드를 덮는 필수 입력 모달.
 *
 * 방문 인원은 결과리포트(총 방문객·일자별 추이·경제효과)의 근거 데이터이고
 * 하루가 지나면 되짚어 세기 어려운 값이라, 총괄관리자가 대시보드에 들어올 때마다
 * 밀린 날을 한 번에 채우게 한다. 하루씩 반복해 묻지 않고 누락된 날을 모두 한 화면에
 * 나열하는 이유도 같다 — 축제가 길수록 하루씩 묻는 방식은 감당이 안 된다.
 *
 * 닫기(X)·바깥 클릭·ESC를 모두 막는다. 필수값이라 빠져나갈 길을 열어 두면 게이트가
 * 의미를 잃기 때문이다. 대신 딤은 상단바 아래에서 시작해(`DIALOG_OVERLAY_CLASSES`)
 * 뒤편 대시보드가 비치고 헤더로 다른 화면에 갈 수 있으므로 화면에 갇히지는 않는다.
 */
export function MissingVisitorCountDialog({
  festivalId,
  missingDays,
  festivalName,
}: MissingVisitorCountDialogProps) {
  const queryClient = useQueryClient();
  const [counts, setCounts] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        missingDays.map((day) =>
          updateDailyVisitorCount(festivalId, day.visitDate, Number(counts[day.visitDate])),
        ),
      );
    },
    /*
      날짜별로 요청이 따로 나가므로 일부만 성공할 수 있다. 실패했을 때도 목록을 다시
      받아 와야 «이미 저장된 날»이 빠진 상태로 다시 뜬다 — 성공한 날까지 또 입력하게
      두면 같은 값을 덮어쓰게 된다.
    */
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["festival-visitor-counts", festivalId] }),
  });

  const filled = missingDays.every((day) => {
    const value = counts[day.visitDate] ?? "";
    return value.trim() !== "" && Number(value) >= 0;
  });
  const blockedReason = filled ? null : "누락된 날짜의 방문 인원을 모두 입력해 주세요.";

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY_CLASSES} />
        {/*
          입력 행이 누락 일수만큼 늘어난다. 높이를 화면 안에 가두고 목록만 안에서
          스크롤시켜, 아무리 많이 밀려도 제목과 저장 버튼이 잘리지 않게 한다.
          모바일 주소창 때문에 `vh`는 실제 보이는 높이보다 커지므로 `dvh`를 쓴다.

          세로 가운데 정렬을 쓰지 않는 이유: 누락 일수가 많으면 카드가 길어지면서
          위로 자라 상단바를 덮는다. 딤은 상단바 아래에서 시작하는데 카드만 그 위로
          올라가면 헤더가 반쯤 가린 채로 남는다. 상단바 바로 아래에서 시작하고
          남은 높이만큼만 차지하게 둔다.
        */}
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[calc(var(--console-topbar-height,0px)+20px)] left-1/2 z-30 flex max-h-[calc(100dvh-var(--console-topbar-height,0px)-40px)] w-[480px] max-w-[calc(100vw-40px)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-white"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="flex shrink-0 flex-col gap-2 px-5 py-6 sm:px-8">
            <Dialog.Title className="heading-small text-zinc-950">
              {festivalName
                ? `«${festivalName}» 축제가 끝났습니다`
                : "지난 날짜의 방문 인원이 비어 있습니다"}
            </Dialog.Title>
            {/*
              문장마다 줄을 나눈다. 두 문장을 한 덩어리로 흘리면 「입력해야 / 축제를」처럼
              문장 한가운데서 줄이 꺾여 읽는 호흡이 끊긴다. 한국어는 낱말 안에서도 줄이
              꺾이므로 break-keep으로 단어가 쪼개지는 것도 함께 막는다.
            */}
            <div className="body-small flex flex-col gap-0.5 break-keep text-zinc-950">
              <p>결과리포트가 이 값을 근거로 축제성과를 계산합니다.</p>
              <p>
                밀린 날짜를 모두 입력해야
                {festivalName
                  ? " 축제를 마무리할 수 있습니다."
                  : " 대시보드를 이어서 볼 수 있습니다."}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-zinc-200 p-5 sm:p-8">
            {missingDays.map((day) => (
              <Input
                key={day.visitDate}
                label={`${day.dayIndex}일차 (${toDisplayDate(day.visitDate)})`}
                inputMode="numeric"
                placeholder="방문인원을 입력해 주세요"
                value={counts[day.visitDate] ? Number(counts[day.visitDate]).toLocaleString() : ""}
                onChange={(event) =>
                  setCounts((current) => ({
                    ...current,
                    [day.visitDate]: event.target.value.replace(/\D/g, ""),
                  }))
                }
              />
            ))}
          </div>

          <div className="flex shrink-0 flex-col gap-2 px-5 pb-5 sm:px-8 sm:pb-8">
            {saveMutation.isError ? (
              <p className="body-caption text-error">
                {getApiErrorMessage(saveMutation.error, "방문 인원을 저장하지 못했습니다.")}
              </p>
            ) : null}
            <p className="body-caption text-zinc-500">
              {blockedReason ??
                (festivalName ? "저장하면 콘솔로 돌아갑니다." : "저장하면 대시보드로 돌아갑니다.")}
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={!filled || saveMutation.isPending}
              title={blockedReason ?? undefined}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? "저장 중..." : "입력하기"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
