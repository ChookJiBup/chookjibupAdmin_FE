"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export type InputLayout = "default" | "label-left" | "with-button";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** 필드 위(또는 "label-left" 레이아웃에서는 옆)에 렌더링되는 라벨. */
  label?: string;
  /** 필드 아래 렌더링되는 도움말 텍스트. `errorText`가 있으면 숨겨진다. "label-left" 레이아웃에서는 표시되지 않는다. */
  helperText?: ReactNode;
  /** helperText의 타이포그래피·색상 클래스. 기본값은 `body-caption text-zinc-500`. */
  helperTextClassName?: string;
  /** 필드 아래 렌더링되는 에러 메시지. 필드를 에러 상태로 전환한다. "label-left" 레이아웃에서는 표시되지 않는다. */
  errorText?: string;
  /** label/field/button의 구조적 레이아웃. 기본값은 `"default"`(라벨 위, 필드 아래). */
  layout?: InputLayout;
  /** 필드 옆에 렌더링되는 버튼. `layout="with-button"`일 때만 사용된다. */
  button?: ReactNode;
  /** 최외곽 wrapper에 적용된다. */
  wrapperClassName?: string;
}

export function Input({
  label,
  helperText,
  helperTextClassName = "body-small text-zinc-500",
  errorText,
  layout = "default",
  button,
  required,
  disabled,
  id,
  className,
  wrapperClassName,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const isError = Boolean(errorText);

  const describedBy =
    [isError ? errorId : helperText ? helperId : null, ariaDescribedBy].filter(Boolean).join(" ") ||
    undefined;

  const labelEl = label ? (
    <label htmlFor={inputId} className="body-small-bold shrink-0 text-zinc-950">
      {label}
    </label>
  ) : null;

  const field = (
    <input
      id={inputId}
      disabled={disabled}
      required={required}
      aria-invalid={isError || undefined}
      aria-describedby={describedBy}
      className={`w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 body-regular text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:placeholder:text-zinc-400 ${
        isError ? "border-red-600 placeholder:text-red-600" : ""
      } ${className ?? ""}`}
      {...props}
    />
  );

  if (layout === "label-left") {
    return (
      <div className={`inline-flex items-center gap-3 ${wrapperClassName ?? ""}`}>
        {labelEl}
        {field}
      </div>
    );
  }

  return (
    <div className={`flex w-full min-w-0 flex-col gap-1 ${wrapperClassName ?? ""}`}>
      {labelEl}

      {layout === "with-button" ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[140px] flex-1">{field}</div>
          {button}
        </div>
      ) : (
        field
      )}

      {isError ? (
        <p id={errorId} className="body-small text-red-600">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={helperId} className={helperTextClassName}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
