"use client";

import { Cross1Icon } from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

export interface MapNoticeCardProps {
  title: string;
  description: ReactNode;
  onClose: () => void;
  descriptionIcon?: ReactNode;
  className?: string;
}

/** 지도 위에 노출되는 안내·AI 제안 카드의 공통 셸. */
export function MapNoticeCard({
  title,
  description,
  onClose,
  descriptionIcon,
  className,
}: MapNoticeCardProps) {
  return (
    <div
      className={cn(
        "w-72 rounded-lg border border-zinc-300 bg-white px-5 py-4 shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="body-small-bold text-zinc-950">{title}</p>
        <IconButton
          variant="ghost"
          icon={<Cross1Icon />}
          aria-label="안내 닫기"
          onClick={onClose}
          className="-mt-1 -mr-1 shrink-0 text-zinc-500"
        />
      </div>
      <div className="mt-1 flex items-center gap-2.5">
        {descriptionIcon ? <span className="size-4 shrink-0">{descriptionIcon}</span> : null}
        <div className="body-small text-zinc-500">{description}</div>
      </div>
    </div>
  );
}
