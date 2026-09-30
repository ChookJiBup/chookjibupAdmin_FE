"use client";

import { useState, type ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Crosshair2Icon,
  DesktopIcon,
} from "@radix-ui/react-icons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapSidePanel } from "@/components/map/MapSidePanel";
import { cn } from "@/lib/utils";
import type { Booth, BoothZone } from "./types";

interface ZoneSectionProps {
  zone: BoothZone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBoothId: string | undefined;
  onSelectBooth: (booth: Booth) => void;
}

function ZoneSection({
  zone,
  open,
  onOpenChange,
  selectedBoothId,
  onSelectBooth,
}: ZoneSectionProps) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="border-b border-zinc-200 last:border-b-0"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-lg py-3 text-left hover:bg-zinc-100">
        {open ? (
          <ChevronDownIcon className="size-5 shrink-0 text-zinc-950" />
        ) : (
          <ChevronRightIcon className="size-5 shrink-0 text-zinc-950" />
        )}
        <DesktopIcon className="size-4 shrink-0 text-primary" />
        <span className="body-regular-bold text-zinc-950">{zone.name}</span>
        <span className="body-regular-bold text-primary">{zone.booths.length}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul className="flex flex-col gap-1 pb-3 pl-6">
          {zone.booths.map((booth) => {
            const isSelected = selectedBoothId === booth.boothId;
            return (
              <li key={booth.boothId}>
                <button
                  type="button"
                  onClick={() => onSelectBooth(booth)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-100",
                    isSelected && "bg-zinc-100",
                  )}
                >
                  <Crosshair2Icon className="size-4 shrink-0 text-primary" />
                  <span className="body-regular truncate text-zinc-950">{booth.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export interface BoothZoneListProps {
  zones: BoothZone[];
  selectedBoothId: string | undefined;
  onSelectBooth: (booth: Booth) => void;
  title?: string;
  emptyContent?: ReactNode;
  className?: string;
}

export function BoothZoneList({
  zones,
  selectedBoothId,
  onSelectBooth,
  title = "축제부스",
  emptyContent,
  className,
}: BoothZoneListProps) {
  const [openZoneId, setOpenZoneId] = useState<string | null>(null);
  const boothCount = zones.reduce((total, zone) => total + zone.booths.length, 0);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="body-large-bold py-1.5 text-zinc-950">
        {title} <span className="text-primary">{boothCount}</span>
      </p>
      {boothCount === 0 ? (
        emptyContent
      ) : (
        <div className="flex flex-col gap-1">
          {zones.map((zone) => (
            <ZoneSection
              key={zone.zoneId}
              zone={zone}
              open={openZoneId === zone.zoneId}
              onOpenChange={(open) => setOpenZoneId(open ? zone.zoneId : null)}
              selectedBoothId={selectedBoothId}
              onSelectBooth={onSelectBooth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type BoothTreeSidebarProps = Omit<BoothZoneListProps, "title">;

export function BoothTreeSidebar({
  zones,
  selectedBoothId,
  onSelectBooth,
  emptyContent,
  className,
}: BoothTreeSidebarProps) {
  return (
    <MapSidePanel className={className}>
      <BoothZoneList
        zones={zones}
        selectedBoothId={selectedBoothId}
        onSelectBooth={onSelectBooth}
        emptyContent={emptyContent}
      />
    </MapSidePanel>
  );
}
