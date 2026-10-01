"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { useRef } from "react";
import { Input } from "@/components/ui/Input";
import { DATE_FORMAT_LABEL, formatDateInput, isRealDate } from "./dateFormat";

export interface DateFieldProps {
  label: string;
  /** 화면에 보이는 값. 타이핑 중인 부분 문자열일 수 있다. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  errorText?: string;
  disabled?: boolean;
  wrapperClassName?: string;
}

/**
 * 직접 타이핑과 달력 고르기를 한 칸에서 모두 받는 날짜 입력.
 *
 * 두 경로가 **같은 형식**을 내보내는 것이 이 컴포넌트의 존재 이유다. 타이핑은
 * `formatDateInput`이 `20260327`도 `2026-03-27`로 맞춰 주고, 달력은 네이티브
 * `input[type=date]`의 값이 규격상 이미 `yyyy-MM-dd`라 그대로 쓴다.
 *
 * 달력 버튼은 지원 브라우저에서 네이티브 피커를 직접 열고, 지원하지 않으면 숨겨진
 * 날짜 입력의 기본 클릭 동작을 사용한다. 달력에서 고른 뒤에도 글자는 계속 고칠 수
 * 있어, 둘 중 편한 쪽을 쓰면 된다.
 */
export function DateField({
  label,
  value,
  onChange,
  onBlur,
  errorText,
  disabled,
  wrapperClassName,
}: DateFieldProps) {
  const calendarInputRef = useRef<HTMLInputElement>(null);

  function openCalendar() {
    const calendarInput = calendarInputRef.current;
    if (!calendarInput || disabled) return;
    if (typeof calendarInput.showPicker === "function") {
      try {
        calendarInput.showPicker();
        return;
      } catch {
        // 브라우저가 showPicker를 노출하고도 호출을 막는 경우 기본 동작으로 시도한다.
      }
    }
    calendarInput.focus();
    calendarInput.click();
  }

  return (
    <Input
      label={label}
      required
      layout="with-button"
      wrapperClassName={wrapperClassName}
      placeholder={DATE_FORMAT_LABEL}
      inputMode="numeric"
      maxLength={10}
      value={value}
      disabled={disabled}
      errorText={errorText}
      onChange={(event) => onChange(formatDateInput(event.target.value))}
      onBlur={onBlur}
      button={
        <span className="relative inline-flex shrink-0">
          <button
            type="button"
            aria-label={`${label} 달력 열기`}
            disabled={disabled}
            onClick={openCalendar}
            className={`inline-flex size-10 items-center justify-center rounded-lg border border-zinc-400 bg-white text-zinc-950 disabled:cursor-default ${
              disabled ? "border-zinc-200 text-zinc-400" : "cursor-pointer hover:bg-zinc-100"
            }`}
          >
            <CalendarIcon className="size-5" aria-hidden />
          </button>
          {/*
            실제 날짜 값은 네이티브 input이 관리한다. 버튼에서 showPicker를 호출하므로
            브라우저 내부 달력 아이콘의 작은 클릭 영역에 의존하지 않는다.
          */}
          <input
            ref={calendarInputRef}
            type="date"
            aria-hidden
            tabIndex={-1}
            disabled={disabled}
            value={isRealDate(value) ? value : ""}
            onChange={(event) => {
              if (event.target.value) onChange(event.target.value);
            }}
            className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
          />
        </span>
      }
    />
  );
}
