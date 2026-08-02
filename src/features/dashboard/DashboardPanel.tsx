"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil1Icon, PlusIcon, MinusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { AiSuggestionPanel } from "./AiSuggestionPanel";
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
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const activeSuggestions = MOCK_AI_SUGGESTIONS.filter(
    (suggestion) => !dismissedSuggestionIds.includes(suggestion.id),
  );

  // 지도가 네비바 바로 아래부터 화면 전체를 채우도록 콘솔 콘텐츠 영역의 여백을 없앤다(디자인 스펙).
  useEffect(() => {
    setFullBleed(true);
    return () => setFullBleed(false);
  }, [setFullBleed]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <BoothMapView
        booths={ALL_BOOTHS}
        selectedBooth={selectedBooth}
        onSelectBooth={setSelectedBooth}
        zoomStep={zoomStep}
        suggestions={activeSuggestions}
      />

      <BoothTreeSidebar
        zones={MOCK_ZONES}
        selectedBoothId={selectedBooth?.boothId}
        onSelectBooth={setSelectedBooth}
        className="absolute top-3 bottom-3 left-3 w-72"
      />

      <Button
        variant="primary"
        size="sm"
        icon={<Pencil1Icon />}
        className="absolute top-3 right-3 shadow-md"
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

      <AiSuggestionPanel
        suggestions={activeSuggestions}
        onDismiss={(id) => setDismissedSuggestionIds((ids) => [...ids, id])}
        className="absolute top-3 left-[318px]"
      />
    </div>
  );
}
