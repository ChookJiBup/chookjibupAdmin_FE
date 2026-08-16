"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * variant = default | ghost, size = default | lg | sm.
 * `default`는 원형 배경을 채워서 렌더링(흰색, hover 시 zinc-100);
 * `ghost`는 배경 없이 아이콘만 렌더링(hover 스타일 없음).
 */
export type IconButtonVariant = "default" | "ghost";
export type IconButtonSize = "default" | "lg" | "sm";

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  default: "size-8", // 32px
  lg: "size-9", // 36px
  sm: "size-7", // 28px
};

const ICON_SIZE_CLASSES: Record<IconButtonSize, string> = {
  default: "size-4", // 16px
  lg: "size-5", // 20px
  sm: "size-3", // 12px
};

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  default: "bg-white hover:bg-zinc-100",
  ghost: "bg-transparent",
};

export type IconButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "aria-label"
> & {
  /** 버튼 내부에 렌더링할 아이콘. `size` variant에 맞게 크기가 조정된다. */
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** 내부 아이콘 wrapper에 추가로 적용할 클래스. */
  iconClassName?: string;
  /** 필수 — 아이콘만 있는 버튼이라 보이는 텍스트 라벨이 없다. */
  "aria-label": string;
};

export function IconButton({
  icon,
  variant = "default",
  size = "default",
  className,
  iconClassName,
  "aria-label": ariaLabel,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center justify-center rounded-full p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 disabled:pointer-events-none disabled:opacity-50 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
      {...rest}
    >
      <span
        className={`inline-flex items-center justify-center ${iconClassName ?? ICON_SIZE_CLASSES[size]}`}
      >
        {icon}
      </span>
    </button>
  );
}
