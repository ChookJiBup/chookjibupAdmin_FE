import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "destructive" | "link" | "ghost";
export type ButtonSize = "default" | "lg" | "sm";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  /** 버튼의 시각적 스타일. 기본값은 "primary". */
  variant?: ButtonVariant;
  /** 버튼 크기. 기본값은 "default". */
  size?: ButtonSize;
  /** 네이티브 `<button>`의 type 속성. 기본값은 "button"(폼 제출 아님). */
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  /** 라벨 앞에 렌더링되는 선택적 아이콘. 실제 아이콘 컴포넌트를 전달한다. */
  icon?: ReactNode;
  /** "ghost" 버튼의 선택된(활성) 상태 스타일. 다른 variant에서는 무시된다. */
  selected?: boolean;
}

const BASE_STYLES =
  "inline-flex items-center justify-center rounded-md whitespace-nowrap transition-colors disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400";

const SIZE_STYLES: Record<ButtonSize, string> = {
  default: "body-regular gap-2.5 px-4 py-2",
  lg: "body-large gap-2.5 px-4 py-3",
  sm: "body-small gap-1 px-4 py-1",
};

const SIZE_STYLES_SELECTED: Record<ButtonSize, string> = {
  default: "body-regular-bold gap-2.5 px-4 py-2",
  lg: "body-large-bold gap-2.5 px-4 py-3",
  sm: "body-small-bold gap-1 px-4 py-1",
};

const ICON_SIZE: Record<ButtonSize, string> = {
  default: "size-4",
  lg: "size-5",
  sm: "size-3.5",
};

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 disabled:bg-zinc-200 disabled:text-zinc-400",
  outline:
    "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100 disabled:border-zinc-400 disabled:bg-zinc-200 disabled:text-zinc-400",
  destructive: "bg-error text-white hover:bg-red-600 disabled:bg-zinc-200 disabled:text-zinc-400",
  link: "text-zinc-950 hover:underline disabled:text-zinc-400",
  ghost: "text-zinc-950 hover:bg-zinc-100 disabled:text-zinc-400",
};

const GHOST_SELECTED_STYLES = "text-primary hover:bg-transparent";

export function Button({
  variant = "primary",
  size = "default",
  type = "button",
  icon,
  selected = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const isGhostSelected = variant === "ghost" && selected;

  // cn(twMerge)으로 합쳐야 호출부에서 넘긴 className이 기본 크기·색 클래스를 덮어쓸 수 있다.
  const classes = cn(
    BASE_STYLES,
    isGhostSelected ? SIZE_STYLES_SELECTED[size] : SIZE_STYLES[size],
    VARIANT_STYLES[variant],
    isGhostSelected ? GHOST_SELECTED_STYLES : "",
    className,
  );

  return (
    <button type={type} className={classes} {...props}>
      {icon ? <span className={`shrink-0 ${ICON_SIZE[size]}`}>{icon}</span> : null}
      {children}
    </button>
  );
}
