"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil1Icon, PlusIcon, MinusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { AiSuggestionToasts } from "./AiSuggestionToasts";
import { BoothMapView } from "./BoothMapView";
import { BoothTreeSidebar } from "./BoothTreeSidebar";
import { DashboardStatsBar } from "./DashboardStatsBar";
import { MOCK_AI_SUGGESTIONS, MOCK_SUMMARY, MOCK_ZONES } from "./mockData";
import type { Booth } from "./types";

const ALL_BOOTHS = MOCK_ZONES.flatMap((zone) => zone.booths);

export function DashboardPanel({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [zoomStep, setZoomStep] = useState(0);

  return (
    <div className="relative h-full min-h-[600px] w-full overflow-hidden rounded-lg">
      <BoothMapView
        booths={ALL_BOOTHS}
        selectedBooth={selectedBooth}
        onSelectBooth={setSelectedBooth}
        zoomStep={zoomStep}
      />

      <BoothTreeSidebar
        zones={MOCK_ZONES}
        selectedBoothId={selectedBooth?.boothId}
        onSelectBooth={setSelectedBooth}
        className="absolute top-3 bottom-3 left-3 w-72"
      />

      <Button
        variant="outline"
        size="sm"
        icon={<Pencil1Icon />}
        className="absolute top-3 right-3 bg-white shadow-md"
        onClick={() => router.push(`/console/festivals/${festivalId}/boothmap`)}
      >
        수정하기
      </Button>

      <div className="absolute right-3 bottom-20 flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md">
        <IconButton
          variant="ghost"
          aria-label="지도 확대"
          icon={<PlusIcon />}
          onClick={() => setZoomStep((step) => step - 1)}
          className="rounded-none border-b border-zinc-200"
        />
        <IconButton
          variant="ghost"
          aria-label="지도 축소"
          icon={<MinusIcon />}
          onClick={() => setZoomStep((step) => step + 1)}
          className="rounded-none"
        />
      </div>

      <div className="absolute right-3 bottom-3 left-[318px]">
        <DashboardStatsBar summary={MOCK_SUMMARY} selectedBooth={selectedBooth} />
      </div>

      <AiSuggestionToasts suggestions={MOCK_AI_SUGGESTIONS} />
    </div>
  );
}
