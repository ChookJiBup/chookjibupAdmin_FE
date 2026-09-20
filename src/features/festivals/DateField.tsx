"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
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
 * 달력은 별도 라이브러리를 들이지 않고 네이티브 피커를 아이콘 위에 투명하게 겹쳐
 * 띄운다. `showPicker()`는 브라우저마다 있고 없고가 갈리는데, 이렇게 두면 그냥
 * 눌리는 것만으로 열려 어디서나 같게 동작한다. 달력에서 고른 뒤에도 글자는 계속
 * 고칠 수 있어, 둘 중 편한 쪽을 쓰면 된다.
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
  return (
    <Input
      label={label}
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
        <span
          className={`relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-400 bg-white text-zinc-950 ${
            disabled ? "border-zinc-200 text-zinc-400" : "hover:bg-zinc-100"
          }`}
        >
          <CalendarIcon className="size-5" aria-hidden />
          {/*
            네이티브 달력. 눈에는 안 보이지만 아이콘 자리를 그대로 덮고 있어, 아이콘을
            누르면 곧바로 열린다. 값 형식은 규격상 yyyy-MM-dd라 변환 없이 쓴다.
            달력을 닫으며 비운 경우(value === "")에는 적어 둔 날짜를 지우지 않는다.
          */}
          <input
            type="date"
            aria-label={`${label} 달력에서 고르기`}
            disabled={disabled}
            value={isRealDate(value) ? value : ""}
            onChange={(event) => {
              if (event.target.value) onChange(event.target.value);
            }}
            className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
          />
        </span>
      }
    />
  );
}
