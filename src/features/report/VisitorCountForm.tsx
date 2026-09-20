"use client";

import { Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VisitorCountModeField } from "@/features/festivals/VisitorCountModeField";
import type { FestivalVisitorCountInputMode } from "@/features/festivals/types";
import type { FestivalVisitorDay } from "./types";

export interface VisitorCountFormProps {
  /** 백엔드가 반환한 축제 기간별 방문 인원 입력 상태 */
  days: FestivalVisitorDay[];
  /**
   * 축제에 저장된 집계 방식. "UNSET"이면 이 폼 안에서 먼저 총합/일자별을 고른다 —
   * 화면설계서상 집계 방식 선택은 축제 종료 후 결과리포트 첫 진입에서 한다.
   */
  mode: "DAILY" | "TOTAL" | "UNSET";
  initialTotal?: number | null;
  isPending?: boolean;
  /** 집계 방식이 UNSET이었다면 여기서 고른 방식이 함께 넘어온다. */
  onSubmit: (value: number[] | number, mode: FestivalVisitorCountInputMode) => void;
  /**
   * 입력하지 않고 이전 화면(축제관리)으로 돌아갈 때 호출된다.
   *
   * 방문 인원은 필수값이라 «나중에 입력» 같은 건너뛰기 버튼은 두지 않는다.
   * 그렇다고 닫는 길까지 막으면 사용자가 이 화면에 갇히므로, 닫기(X)는
   * 남기되 «다음 화면(결과리포트)»이 아니라 이전 화면으로 되돌려 보낸다.
   */
  onClose?: () => void;
}

export function VisitorCountForm({
  days,
  mode,
  initialTotal,
  isPending,
  onSubmit,
  onClose,
}: VisitorCountFormProps) {
  const [dailyCounts, setDailyCounts] = useState<string[]>(
    days.map((day) => day.visitorCount?.toString() ?? ""),
  );
  const [totalCount, setTotalCount] = useState(initialTotal?.toString() ?? "");
  // 축제에 집계 방식이 저장돼 있으면 그대로 쓰고, UNSET이면 사용자가 고를 때까지 null.
  const [pickedMode, setPickedMode] = useState<FestivalVisitorCountInputMode | null>(
    mode === "UNSET" ? null : mode,
  );
  const editableDayIndexes = days.flatMap((day, index) => (day.inputAllowed ? [index] : []));

  // 백엔드는 지난 일자(일일마감된 일자)만 입력을 허용한다. 아직 마감된 일자가
  // 하나도 없으면 저장할 것이 없으므로 제출을 막는다.
  const dailyValid =
    editableDayIndexes.length > 0 &&
    editableDayIndexes.every((index) => {
      const value = dailyCounts[index];
      return value.trim() !== "" && Number(value) >= 0;
    });
  const dailyTotal = dailyCounts.reduce((sum, value) => sum + (Number(value) || 0), 0);

  function numbersOnly(value: string) {
    return value.replace(/\D/g, "");
  }

  function handleSubmit() {
    if (!pickedMode) return;
    if (pickedMode === "TOTAL") {
      if (totalCount.trim() === "") return;
      onSubmit(Number(totalCount), pickedMode);
      return;
    }
    if (dailyValid) onSubmit(dailyCounts.map(Number), pickedMode);
  }

  const valid = !pickedMode
    ? false
    : pickedMode === "TOTAL"
      ? totalCount.trim() !== ""
      : dailyValid;

  /*
    방문 인원은 결과리포트(총 방문객·일자별 추이·경제효과)의 근거 데이터라
    비워 둔 채로는 리포트를 만들 수 없다. 그래서 제출 버튼을 잠그는데,
    왜 안 눌리는지 모른 채 멈추지 않도록 잠긴 이유를 항상 문장으로 알려 준다.
  */
  const blockedReason = valid
    ? null
    : !pickedMode
      ? "집계 방식을 먼저 선택해 주세요."
      : pickedMode === "TOTAL"
        ? "총 방문객 수를 입력해 주세요."
        : editableDayIndexes.length === 0
          ? "아직 마감된 일자가 없어 입력할 수 있는 날이 없습니다."
          : "마감된 모든 일차의 방문 인원을 입력해 주세요.";

  return (
    /*
      기간이 긴 축제는 일차 입력칸이 그만큼 늘어난다. 높이를 안 잡아 두면 세로 중앙
      정렬이 위아래를 동시에 밀어내, 218일 축제에서는 제목·닫기가 화면 위로 1만 px
      밖으로 나가 아예 닿을 수 없었다. 카드를 화면 높이 안에 가두고 입력칸만 안에서
      스크롤시킨다. 버튼 줄은 스크롤 밖에 둬서 「입력하기」가 항상 보이게 한다.

      `my-auto`는 오버레이가 `items-start`로 바뀐 데 따른 것이다. 카드가 화면보다
      작을 때는 지금까지처럼 가운데에 놓이고, 어떤 이유로든 카드가 화면보다 커지면
      `items-center`와 달리 위쪽이 스크롤로 닿지 않는 영역에 잘려 들어가지 않는다.
    */
    <div className="my-auto flex max-h-full w-[480px] max-w-full flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white">
      <div className="flex shrink-0 items-center gap-1.5 px-5 py-4 sm:px-8">
        {/* 좌우 균형을 맞추려 닫기 버튼과 같은 폭의 자리를 왼쪽에 비워 둔다. */}
        <span aria-hidden className="size-8 shrink-0" />
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <h2 className="heading-small text-center text-zinc-950">축제 방문 인원</h2>
          <Tooltip>
            <TooltipTrigger aria-label="도움말">
              <InfoCircledIcon className="size-4 text-zinc-400" />
            </TooltipTrigger>
            <TooltipContent>방문인원을 입력하면 축제성과를 분석할 수 있어요.</TooltipContent>
          </Tooltip>
        </div>
        {onClose ? (
          <IconButton aria-label="닫기" variant="ghost" icon={<Cross2Icon />} onClick={onClose} />
        ) : (
          <span aria-hidden className="size-8 shrink-0" />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-zinc-200 p-5 sm:p-8">
        <div className="flex flex-col gap-5">
          {mode === "UNSET" ? (
            <VisitorCountModeField
              label="방문 인원 집계 방식"
              value={pickedMode}
              onChange={setPickedMode}
            />
          ) : null}
          {!pickedMode ? null : pickedMode === "TOTAL" ? (
            <Input
              label="총 방문객"
              inputMode="numeric"
              placeholder="전체 방문 인원을 입력해 주세요"
              value={totalCount ? Number(totalCount).toLocaleString() : ""}
              onChange={(event) => setTotalCount(numbersOnly(event.target.value))}
            />
          ) : (
            dailyCounts.map((value, index) => (
              <Input
                key={days[index].visitDate}
                label={`${days[index].dayIndex}일차`}
                disabled={!days[index].inputAllowed}
                helperText={days[index].inputAllowed ? undefined : "마감 후 입력할 수 있어요"}
                inputMode="numeric"
                placeholder="방문인원을 입력해 주세요"
                value={value ? Number(value).toLocaleString() : ""}
                onChange={(event) => {
                  const next = [...dailyCounts];
                  next[index] = numbersOnly(event.target.value);
                  setDailyCounts(next);
                }}
              />
            ))
          )}
          {pickedMode === "DAILY" ? (
            <Input
              label="총합"
              disabled
              placeholder="자동 계산"
              value={dailyValid ? dailyTotal.toLocaleString() : ""}
            />
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-5 pb-5 sm:px-8 sm:pb-8">
        <p className="body-caption text-zinc-500">
          {blockedReason ?? "입력한 방문 인원으로 결과리포트를 만듭니다."}
        </p>
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!valid || isPending}
          title={blockedReason ?? undefined}
          onClick={handleSubmit}
        >
          {isPending ? "저장 중..." : "입력하기"}
        </Button>
      </div>
    </div>
  );
}
