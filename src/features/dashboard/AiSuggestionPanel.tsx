"use client";

import { Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import type { AiSuggestion } from "./types";

/** 지도 위에 고정 카드로 노출되는 AI 제안. 닫으면 해당 제안의 경로선도 지도에서 같이 사라진다. */
export function AiSuggestionPanel({
  suggestions,
  onDismiss,
  className,
}: {
  suggestions: AiSuggestion[];
  onDismiss: (id: string) => void;
  className?: string;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="w-80 rounded-lg border border-zinc-200 bg-white p-3 shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="body-small-bold text-zinc-950">{suggestion.title}</p>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="AI 제안 닫기"
              icon={<Cross2Icon />}
              onClick={() => onDismiss(suggestion.id)}
              className="-mt-1 -mr-1"
            />
          </div>
          <div className="mt-1.5 flex items-start gap-1.5">
            <ExclamationTriangleIcon className="text-point-600 mt-0.5 size-3.5 shrink-0" />
            <p className="body-caption text-zinc-500">{suggestion.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
