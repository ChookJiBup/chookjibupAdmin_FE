"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, DesktopIcon, TargetIcon } from "@radix-ui/react-icons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CongestionBadge } from "@/components/ui/CongestionBadge";
import { cn } from "@/lib/utils";
import { getTotalBoothCount } from "./mockData";
import type { Booth, BoothZone } from "./types";

function ZoneSection({
  zone,
  selectedBoothId,
  onSelectBooth,
}: {
  zone: BoothZone;
  selectedBoothId: string | undefined;
  onSelectBooth: (booth: Booth) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100">
        {open ? (
          <ChevronDownIcon className="size-3.5 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRightIcon className="size-3.5 shrink-0 text-zinc-500" />
        )}
        <span className="body-small-bold text-zinc-950">{zone.name}</span>
        <span className="body-small-bold text-primary">{zone.booths.length}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul className="flex flex-col gap-0.5 py-1 pl-6">
          {zone.booths.map((booth) => {
            const isSelected = selectedBoothId === booth.boothId;
            return (
              <li key={booth.boothId}>
                <button
                  type="button"
                  onClick={() => onSelectBooth(booth)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-zinc-100",
                    isSelected && "bg-zinc-100",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {isSelected ? (
                      <span className="w-3.5 shrink-0" />
                    ) : (
                      <ChevronRightIcon className="size-3.5 shrink-0 text-zinc-400" />
                    )}
                    {isSelected ? (
                      <TargetIcon className="text-primary size-3.5 shrink-0" />
                    ) : (
                      <DesktopIcon className="text-primary size-3.5 shrink-0" />
                    )}
                    <span className="body-small truncate text-zinc-950">{booth.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="body-caption text-zinc-400">약 {booth.waitMinutes}분</span>
                    <CongestionBadge level={booth.congestionLevel} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function BoothTreeSidebar({
  zones,
  selectedBoothId,
  onSelectBooth,
  className,
}: {
  zones: BoothZone[];
  selectedBoothId: string | undefined;
  onSelectBooth: (booth: Booth) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-none flex flex-col overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 shadow-md",
        className,
      )}
    >
      <p className="body-small-bold px-2 py-1.5 text-zinc-950">
        축제부스 <span className="text-primary">{getTotalBoothCount(zones)}</span>
      </p>
      <div className="flex flex-col gap-1">
        {zones.map((zone) => (
          <ZoneSection
            key={zone.zoneId}
            zone={zone}
            selectedBoothId={selectedBoothId}
            onSelectBooth={onSelectBooth}
          />
        ))}
      </div>
    </div>
  );
}
