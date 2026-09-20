"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { VisitorCountModeField } from "@/features/festivals/VisitorCountModeField";
import type { FestivalVisitorCountInputMode } from "@/features/festivals/types";
import {
  VisitorCountCard,
  VisitorCountTotalField,
  VisitorDayFields,
  formatVisitorCount,
  visitorCountHint,
} from "./VisitorCountCard";
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

/**
 * 결과리포트 첫 진입에서 여는 방문 인원 입력 폼.
 *
 * 겉모양(말풍선·제목·총합·버튼)은 하루 마감 모달과 `VisitorCountCard`를 함께 써서
 * 맞춘다. 다만 «집계 방식 선택»과 «총 방문객 한 칸 입력»은 이 화면에만 있는 단계라
 * 여기 남는다 — 모달은 이미 일자별로 쌓고 있는 축제만 상대한다.
 */
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
      `my-auto`는 감싼 오버레이가 `items-start`인 데 따른 것이다. 카드가 화면보다
      작을 때는 가운데에 놓이고, 기간이 긴 축제로 카드가 화면보다 커지면
      `items-center`와 달리 위쪽이 스크롤로 닿지 않는 영역에 잘려 들어가지 않는다.
    */
    <VisitorCountCard
      className="my-auto max-h-full"
      hint={visitorCountHint(days)}
      headerAction={
        onClose ? (
          <IconButton aria-label="닫기" variant="ghost" icon={<Cross2Icon />} onClick={onClose} />
        ) : undefined
      }
      footer={
        <>
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
        </>
      }
    >
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
          value={formatVisitorCount(totalCount)}
          onChange={(event) => setTotalCount(event.target.value.replace(/\D/g, ""))}
        />
      ) : (
        <>
          <VisitorDayFields
            days={days}
            values={dailyCounts}
            onChange={(index, value) =>
              setDailyCounts((current) => {
                const next = [...current];
                next[index] = value;
                return next;
              })
            }
          />
          <VisitorCountTotalField values={dailyCounts} />
        </>
      )}
    </VisitorCountCard>
  );
}
