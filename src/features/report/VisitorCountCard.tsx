"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { FestivalVisitorDay } from "./types";

/**
 * 방문 인원 입력 화면의 공통 외형.
 *
 * 같은 값을 두 자리에서 받는다 — 하루가 끝난 다음 날 콘솔을 덮는 모달과,
 * 결과리포트 첫 진입에서 여는 폼이다. 시안은 둘을 같은 카드로 그리고 있어
 * 껍데기(말풍선·제목·스크롤 영역·고정 푸터)를 여기 한 곳에 두고 안쪽 내용만
 * 각자 채운다. 예전에는 두 파일이 각자 카드를 그려서, 한쪽만 고치면 다른 쪽이
 * 조용히 달라졌다.
 */

/** 아직 한 날도 입력되지 않았을 때 말풍선 문구. 왜 입력해야 하는지를 알린다. */
export const VISITOR_COUNT_HINT_EMPTY = "방문인원을 입력하면 축제성과를 분석할 수 있어요.";
/** 이미 입력된 날이 있을 때의 문구. 채워진 값도 고칠 수 있다는 뜻을 담는다. */
export const VISITOR_COUNT_HINT_REVIEW = "입력된 방문인원이 맞는지 확인해 주세요";

/**
 * 말풍선 문구를 고른다.
 *
 * 판정은 서버가 준 값(`visitorCount`)으로만 한다. 사용자가 방금 타이핑한 값까지
 * 세면 첫 글자를 넣는 순간 문구가 바뀌어 화면이 흔들린다.
 */
export function visitorCountHint(days: FestivalVisitorDay[]): string {
  return days.some((day) => day.visitorCount !== null)
    ? VISITOR_COUNT_HINT_REVIEW
    : VISITOR_COUNT_HINT_EMPTY;
}

/** 숫자 문자열을 천 단위 쉼표로. 빈 값은 placeholder가 보이도록 빈 문자열로 둔다. */
export function formatVisitorCount(value: string): string {
  return value ? Number(value).toLocaleString() : "";
}

export interface VisitorCountCardProps {
  /** 카드 위에 떠 있는 검은 말풍선 문구. */
  hint: ReactNode;
  /** 기본 제목(`축제 방문 인원`) 대신 쓸 노드. 모달에서는 `Dialog.Title`을 넣는다. */
  title?: ReactNode;
  /** 제목 줄 오른쪽 자리. 닫기 버튼이 필요한 화면에서만 채운다. */
  headerAction?: ReactNode;
  /** 스크롤되는 입력 영역. */
  children: ReactNode;
  /** 스크롤 밖에 고정되는 푸터(안내 문구 + 제출 버튼). */
  footer: ReactNode;
  className?: string;
}

export function VisitorCountCard({
  hint,
  title,
  headerAction,
  children,
  footer,
  className,
}: VisitorCountCardProps) {
  return (
    /*
      일차가 쌓일수록 입력칸이 늘어난다. 높이를 호출부가 준 범위 안에 가두고
      입력 목록만 안에서 스크롤시켜, 축제가 길어져도 제목·총합·버튼이 잘리지 않게 한다.
    */
    <div className={cn("flex w-[480px] max-w-full flex-col gap-2", className)}>
      {/*
        시안의 검은 말풍선. hover로 뜨는 도움말이 아니라 항상 보이는 안내라
        `Tooltip`(트리거 필요)을 쓰지 않고 카드 위에 그대로 얹는다. 꼬리는 테두리로
        만든 삼각형이며 장식일 뿐이라 보조기기에서 감춘다.
      */}
      <div className="body-caption relative shrink-0 self-center rounded-lg bg-zinc-900 px-4 py-2 text-center break-keep text-white">
        {hint}
        <span
          aria-hidden
          className="absolute top-full left-1/2 block size-0 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-zinc-900"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-white">
        <div className="flex shrink-0 items-center gap-1.5 px-5 py-4 sm:px-8">
          {/* 제목을 카드 한가운데 두려고 오른쪽 자리와 같은 폭을 왼쪽에 비워 둔다. */}
          <span aria-hidden className="size-8 shrink-0" />
          <div className="flex flex-1 items-center justify-center">
            {title ?? <h2 className="heading-small text-center text-zinc-950">축제 방문 인원</h2>}
          </div>
          {headerAction ?? <span aria-hidden className="size-8 shrink-0" />}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto border-t border-zinc-200 p-5 sm:p-8">
          {children}
        </div>

        <div className="flex shrink-0 flex-col gap-2 px-5 pb-5 sm:px-8 sm:pb-8">{footer}</div>
      </div>
    </div>
  );
}

export interface VisitorDayFieldsProps {
  days: FestivalVisitorDay[];
  /** `days`와 같은 순서의 입력값(숫자만 남긴 문자열). */
  values: string[];
  onChange: (index: number, value: string) => void;
}

/**
 * 일차별 입력칸. 라벨은 날짜 없이 `N일차`만 쓴다 — 시안이 그렇고, 괄호 안의 날짜는
 * 일차가 쌓일수록 라벨을 길게 만들기만 한다.
 */
export function VisitorDayFields({ days, values, onChange }: VisitorDayFieldsProps) {
  return (
    <>
      {days.map((day, index) => (
        <Input
          key={day.visitDate}
          label={`${day.dayIndex}일차`}
          // 아직 마감되지 않은 날은 백엔드가 입력을 거절한다. 보내기 전에 막는다.
          disabled={!day.inputAllowed}
          helperText={day.inputAllowed ? undefined : "마감 후 입력할 수 있어요"}
          inputMode="numeric"
          placeholder="방문인원을 입력해 주세요"
          value={formatVisitorCount(values[index] ?? "")}
          onChange={(event) => onChange(index, event.target.value.replace(/\D/g, ""))}
        />
      ))}
    </>
  );
}

/**
 * 일차 값을 더한 `총합` 칸.
 *
 * 직접 고치는 값이 아니라 비활성으로 둔다. 한 칸이라도 채워지면 그때까지의 합을
 * 보여 준다 — 전부 채우기 전까지 비워 두면 방금 넣은 숫자가 어디에 쌓이는지 알 수 없다.
 */
export function VisitorCountTotalField({ values }: { values: string[] }) {
  const hasAny = values.some((value) => value.trim() !== "");
  const sum = values.reduce((total, value) => total + (Number(value) || 0), 0);
  return (
    <Input
      label="총합"
      disabled
      placeholder="자동 계산"
      value={hasAny ? sum.toLocaleString() : ""}
    />
  );
}
