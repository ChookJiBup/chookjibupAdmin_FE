"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, DesktopIcon, TargetIcon } from "@radix-ui/react-icons";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CongestionBadge } from "@/components/ui/CongestionBadge";
import { MapSidePanel } from "@/components/map/MapSidePanel";
import { cn } from "@/lib/utils";
import type { Booth, BoothZone } from "./types";

interface BoothGroup {
  representative: Booth;
  booths: Booth[];
}

function groupBooths(zone: BoothZone): BoothGroup[] {
  if (zone.zoneId === "event-gimbap") {
    const representativeIndexes = [0, 2, 3, 4, 5, 6];
    const childIndexes = [1, 7, 8, 9, 10, 11];
    return representativeIndexes.map((representativeIndex, index) => ({
      representative: zone.booths[representativeIndex],
      booths: zone.booths[childIndexes[index]] ? [zone.booths[childIndexes[index]]] : [],
    }));
  }

  const representativeCount = Math.ceil(zone.booths.length / 2);
  return zone.booths.slice(0, representativeCount).map((representative, index) => ({
    representative,
    booths: zone.booths[representativeCount + index]
      ? [zone.booths[representativeCount + index]]
      : [],
  }));
}

function getLeafBoothCount(zone: BoothZone): number {
  return groupBooths(zone).reduce((total, group) => total + group.booths.length, 0);
}

function ZoneSection({
  zone,
  open,
  onOpenChange,
  selectedBoothId,
  onSelectBooth,
}: {
  zone: BoothZone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBoothId: string | undefined;
  onSelectBooth: (booth: Booth) => void;
}) {
  const [openRepresentativeId, setOpenRepresentativeId] = useState<string | null>(null);
  const groups = groupBooths(zone);

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="border-b border-zinc-200 last:border-b-0"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 rounded-lg px-2 py-3 text-left hover:bg-zinc-100">
        {open ? (
          <ChevronDownIcon className="size-5 shrink-0 text-zinc-950" />
        ) : (
          <ChevronRightIcon className="size-5 shrink-0 text-zinc-950" />
        )}
        <span className="body-regular-bold text-zinc-950">{zone.name}</span>
        <span className="body-regular-bold text-primary">{getLeafBoothCount(zone)}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul className="flex flex-col gap-1 pb-3 pl-6">
          {groups.map(({ representative, booths }) => {
            const representativeOpen = openRepresentativeId === representative.boothId;
            return (
              <li key={representative.boothId}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenRepresentativeId(representativeOpen ? null : representative.boothId)
                  }
                  className="flex w-full items-center gap-1.5 rounded-lg px-2 py-2.5 text-left hover:bg-zinc-100"
                >
                  {representativeOpen ? (
                    <ChevronDownIcon className="size-5 shrink-0 text-zinc-950" />
                  ) : (
                    <ChevronRightIcon className="size-5 shrink-0 text-zinc-950" />
                  )}
                  <DesktopIcon className="text-primary size-4 shrink-0" />
                  <span className="body-regular truncate text-zinc-950">{representative.name}</span>
                </button>

                {representativeOpen ? (
                  <ul className="mt-1 flex flex-col gap-1 pl-6">
                    {booths.map((booth) => {
                      const isSelected = selectedBoothId === booth.boothId;
                      return (
                        <li key={booth.boothId}>
                          <button
                            type="button"
                            onClick={() => onSelectBooth(booth)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left hover:bg-zinc-100",
                              isSelected && "bg-zinc-100",
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <TargetIcon className="text-primary size-4 shrink-0" />
                              <span className="body-regular truncate text-zinc-950">
                                {booth.name}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <span className="body-caption text-zinc-400">
                                약 {booth.waitMinutes}분
                              </span>
                              <CongestionBadge level={booth.congestionLevel} />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
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
  const [openZoneId, setOpenZoneId] = useState<string | null>(null);

  return (
    <MapSidePanel className={className}>
      <p className="body-large-bold px-2 py-1.5 text-zinc-950">
        축제부스{" "}
        <span className="text-primary">
          {zones.reduce((total, zone) => total + getLeafBoothCount(zone), 0)}
        </span>
      </p>
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
    </MapSidePanel>
  );
}
