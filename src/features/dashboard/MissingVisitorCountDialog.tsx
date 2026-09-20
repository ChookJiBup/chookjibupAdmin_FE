"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DIALOG_OVERLAY_CLASSES } from "@/components/ui/dialogOverlay";
import { updateDailyVisitorCount } from "@/features/report/api";
import {
  VisitorCountCard,
  VisitorCountTotalField,
  VisitorDayFields,
  visitorCountHint,
} from "@/features/report/VisitorCountCard";
import type { FestivalVisitorDay } from "@/features/report/types";
import { getApiErrorMessage } from "@/lib/api/httpError";

export interface MissingVisitorCountDialogProps {
  festivalId: string;
  /**
   * 하루가 끝난 일차 전부(`elapsedVisitorDays`). 비어 있는 날만이 아니다.
   *
   * 이미 입력한 날도 값이 채워진 채로 함께 보여 준다. 사용자가 원한 모양이
   * «2일차가 끝나면 1일차(입력값)와 2일차(빈칸)가 같이 뜬다»라서다. 덕분에 전날
   * 잘못 적은 값을 그 자리에서 고칠 수 있고, 총합도 눈으로 확인된다.
   */
  days: FestivalVisitorDay[];
  /**
   * 어느 축제 이야기인지 밝힐 이름.
   *
   * 대시보드처럼 이미 축제 하나를 보고 있는 화면에서는 필요 없지만, 콘솔 첫 화면에서
   * 뜰 때는 관리하는 축제가 여럿일 수 있어 이름이 없으면 어느 축제의 인원인지 알 수 없다.
   */
  festivalName?: string;
}

/**
 * 하루가 끝난 다음 날, 그 일차의 방문 인원이 비어 있으면 콘솔을 덮는 필수 입력 모달.
 *
 * 방문 인원은 결과리포트(총 방문객·일자별 추이·경제효과)의 근거 데이터이고
 * 하루가 지나면 되짚어 세기 어려운 값이라, 총괄관리자가 들어올 때마다 그때까지의
 * 일차를 한 화면에 모아 받는다. 축제가 끝나기를 기다리지 않는다 — 끝난 뒤에 몰아서
 * 물으면 열흘 전 인원을 기억으로 적게 된다.
 *
 * 닫기(X)·바깥 클릭·ESC를 모두 막는다. 필수값이라 빠져나갈 길을 열어 두면 게이트가
 * 의미를 잃기 때문이다. 대신 딤은 상단바 아래에서 시작해(`DIALOG_OVERLAY_CLASSES`)
 * 뒤편 화면이 비치고 헤더로 다른 화면에 갈 수 있으므로 화면에 갇히지는 않는다.
 */
export function MissingVisitorCountDialog({
  festivalId,
  days,
  festivalName,
}: MissingVisitorCountDialogProps) {
  const queryClient = useQueryClient();
  /*
    사용자가 «고친 값»만 담는다. 화면에 뿌릴 값은 «고친 값 ?? 서버 값»이라, 저장 뒤
    목록을 다시 받아도 서버 값과 같아져 자연스럽게 «바뀐 날 없음»이 된다.
  */
  const [edits, setEdits] = useState<Record<string, string>>({});

  const savedValues = days.map((day) => day.visitorCount?.toString() ?? "");
  const values = days.map((day, index) => edits[day.visitDate] ?? savedValues[index]);
  /*
    값이 실제로 달라진 날만 저장한다. 저장이 날짜별 PUT이라 안 바뀐 날까지 매번
    보내면 (1) 서버가 그 행의 수정 시각을 매일 새로 찍고 (2) 전 일차가 채워진
    축제에서는 PUT마다 결과리포트 생성 큐를 다시 건드린다(`enqueueIfReady`).
    둘 다 사용자가 한 일이 없는데 일어나는 변화라 막는다.
  */
  const changedDays = days.filter((day, index) => values[index] !== savedValues[index]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        changedDays.map((day) =>
          updateDailyVisitorCount(festivalId, day.visitDate, Number(edits[day.visitDate])),
        ),
      );
    },
    /*
      날짜별로 요청이 따로 나가므로 일부만 성공할 수 있다. 실패했을 때도 목록을 다시
      받아 와야 «이미 저장된 날»이 값이 채워진 상태로 다시 뜬다.
    */
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["festival-visitor-counts", festivalId] }),
  });

  const filled = values.every((value) => value.trim() !== "" && Number(value) >= 0);
  const blockedReason = filled ? null : "지나간 일차의 방문 인원을 모두 입력해 주세요.";

  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY_CLASSES} />
        {/*
          세로 가운데 정렬을 쓰지 않는 이유: 일차가 쌓이면 카드가 길어지면서 위로 자라
          상단바를 덮는다. 딤은 상단바 아래에서 시작하는데 카드만 그 위로 올라가면
          헤더가 반쯤 가린 채로 남는다. 상단바 바로 아래에서 시작하고 남은 높이만큼만
          차지하게 둔다. 모바일 주소창 때문에 `vh`는 실제 보이는 높이보다 커지므로
          `dvh`를 쓴다.
        */}
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[calc(var(--console-topbar-height,0px)+20px)] left-1/2 z-30 flex max-h-[calc(100dvh-var(--console-topbar-height,0px)-40px)] max-w-[calc(100vw-40px)] -translate-x-1/2 flex-col"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <VisitorCountCard
            className="min-h-0 flex-1"
            hint={visitorCountHint(days)}
            title={
              <div className="flex min-w-0 flex-col items-center">
                <Dialog.Title className="heading-small text-center text-zinc-950">
                  축제 방문 인원
                </Dialog.Title>
                {festivalName ? (
                  <p className="body-caption truncate text-zinc-500">{festivalName}</p>
                ) : null}
              </div>
            }
            footer={
              <>
                {saveMutation.isError ? (
                  <p className="body-caption text-error">
                    {getApiErrorMessage(saveMutation.error, "방문 인원을 저장하지 못했습니다.")}
                  </p>
                ) : null}
                <p className="body-caption text-zinc-500">
                  {blockedReason ?? "저장하면 원래 화면으로 돌아갑니다."}
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
              </>
            }
          >
            <VisitorDayFields
              days={days}
              values={values}
              onChange={(index, value) =>
                setEdits((current) => ({ ...current, [days[index].visitDate]: value }))
              }
            />
            <VisitorCountTotalField values={values} />
          </VisitorCountCard>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
