"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PIN_TYPE_OPTIONS } from "./nodeTypeIcons";
import type { NodeType } from "./types";

export interface NodeTypeMenuProps {
  onSelect: (nodeType: NodeType) => void;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
  onDismiss: () => void;
}

/** 핀 추가와 유형 변경에서 공통으로 쓰는 지도 노드 유형 메뉴. */
export function NodeTypeMenu({
  onSelect,
  className,
  disabled = false,
  disabledReason,
  onDismiss,
}: NodeTypeMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onDismiss();
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [onDismiss]);

  return (
    <div
      ref={menuRef}
      className={cn(
        "flex w-25 flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-md",
        className,
      )}
    >
      {PIN_TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          onClick={() => onSelect(option.value)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span className="size-4 shrink-0 text-primary [&_svg]:size-4">{option.icon}</span>
          <span className="body-small text-zinc-950">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
