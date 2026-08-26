import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MapSidePanelProps {
  children: ReactNode;
  className?: string;
}

/** 지도 화면 좌측에서 목록·상태 정보를 보여주는 공통 패널 셸. */
export function MapSidePanel({ children, className }: MapSidePanelProps) {
  return (
    <aside
      className={cn(
        "scrollbar-none flex h-full w-72 flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-300 bg-white p-6 shadow-md",
        className,
      )}
    >
      {children}
    </aside>
  );
}
