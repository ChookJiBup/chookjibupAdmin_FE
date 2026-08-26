import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MapOverlayCardProps {
  children: ReactNode;
  className?: string;
  showPointer?: boolean;
}

/** 지도 좌표 위에 표시하는 상세정보·편집 팝오버의 공통 카드 셸. */
export function MapOverlayCard({ children, className, showPointer = false }: MapOverlayCardProps) {
  return (
    <div>
      <div
        className={cn("w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-md", className)}
      >
        {children}
      </div>
      {showPointer ? (
        <div className="mx-auto -mt-1.5 size-3 rotate-45 border-r border-b border-zinc-200 bg-white" />
      ) : null}
    </div>
  );
}
