"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil1Icon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { CongestionBadge } from "@/components/ui/CongestionBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { ensureCoordinateMap, getMapEditor } from "@/features/boothmap/api";
import { nodeToLocalBooth } from "@/features/boothmap/geometryWgs84";
import { primaryFestivalCenter } from "@/features/boothmap/mapCenter";
import { getManagedFestival } from "@/features/festivals/api";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { AiSuggestionPanel } from "./AiSuggestionPanel";
import { getFestivalDashboard } from "./api";
import { BoothMapView } from "./BoothMapView";
import { BoothTreeSidebar } from "./BoothTreeSidebar";
import { DashboardStatsBar } from "./DashboardStatsBar";
import { MOCK_AI_SUGGESTIONS, MOCK_SUMMARY } from "./mockData";
import type { Booth, BoothZone } from "./types";

function DashboardMetric({
  value,
  label,
  description,
  valueClassName = "body-regular",
  className = "",
}: {
  value: ReactNode;
  label: string;
  description: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={`flex shrink-0 flex-col gap-1 ${className}`}>
      <div className={`${valueClassName} flex items-center text-zinc-950`}>{value}</div>
      <div className="flex items-center gap-1 body-small text-zinc-500">
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger aria-label={`${label} 도움말`}>
            <QuestionMarkCircledIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function DashboardPanel({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const [selectedBooth, setSelectedBooth] = useState<Booth | null>(null);
  const [zoomStep, setZoomStep] = useState(0);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([]);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const festivalQuery = useQuery({
    queryKey: ["managed-festival", festivalId],
    queryFn: () => getManagedFestival(festivalId),
  });
  const mapCenter = useMemo(
    () => primaryFestivalCenter(festivalQuery.data?.locations),
    [festivalQuery.data?.locations],
  );
  const mapDataQuery = useQuery({
    queryKey: ["dashboard-map", festivalId],
    queryFn: async () => {
      const map = await ensureCoordinateMap(festivalId);
      const editor = await getMapEditor(festivalId, map.mapId);
      return { map, editor };
    },
  });
  const mapBooths = useMemo((): Booth[] => {
    return (mapDataQuery.data?.editor.nodes ?? [])
      .map(nodeToLocalBooth)
      .filter((pin): pin is NonNullable<typeof pin> => pin !== null)
      .map((pin) => ({
        boothId: pin.nodeId ?? pin.id,
        name: pin.name,
        zoneId: "map",
        lat: pin.lat,
        lng: pin.lng,
        congestionLevel: "LOW" as const,
        waitMinutes: 0,
        updatedMinutesAgo: 0,
        lastQueueUpdater: { name: "-", role: "OPERATOR" as const },
        queueZones: [],
      }));
  }, [mapDataQuery.data?.editor.nodes]);
  const mapZones = useMemo((): BoothZone[] => {
    if (mapBooths.length === 0) {
      return [];
    }
    return [{ zoneId: "map", name: "부스", booths: mapBooths }];
  }, [mapBooths]);
  const dashboardMapCenter = mapDataQuery.data?.editor.center ?? mapDataQuery.data?.map.center ?? mapCenter;
  const dashboardQuery = useQuery({
    queryKey: ["festival-dashboard", festivalId],
    queryFn: () => getFestivalDashboard(festivalId),
  });
  const dashboard = dashboardQuery.data?.dataAvailable ? dashboardQuery.data : null;

  // TODO(api/dashboard-detail): 현재 대시보드 API에는 존/부스 계층, 좌표, 부스별 혼잡도,
  // 가장 혼잡한 부스, 일일·누적 방문자, AI 제안이 없다. 해당 필드가 추가되기 전까지
  // 지도 시안 확인용 데이터는 mockData.ts에서만 관리한다.
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
        booths={mapBooths}
        selectedBooth={selectedBooth}
        onSelectBooth={setSelectedBooth}
        zoomStep={zoomStep}
        suggestions={activeSuggestions}
        center={dashboardMapCenter}
      />

      <BoothTreeSidebar
        zones={mapZones}
        selectedBoothId={selectedBooth?.boothId}
        onSelectBooth={setSelectedBooth}
        className="absolute top-10 bottom-10 left-8 w-72"
      />

      <Button
        variant="primary"
        icon={<Pencil1Icon />}
        className="absolute top-10 right-8 shadow-md"
        onClick={() => router.push(`/console/festivals/${festivalId}/boothmap`)}
      >
        수정하기
      </Button>

      <MapZoomControls
        className="absolute right-8 bottom-[142px] [&_button]:shadow-md"
        onZoomIn={() => setZoomStep((step) => step - 1)}
        onZoomOut={() => setZoomStep((step) => step + 1)}
      />

      <div className="absolute right-8 bottom-10 left-[340px]">
        {selectedBooth ? (
          <DashboardStatsBar selectedBooth={selectedBooth} />
        ) : (
          <div className="flex items-center gap-5 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-md">
            <DashboardMetric
              value={<CongestionBadge level={MOCK_SUMMARY.overallCongestion} />}
              label="혼잡도"
              description="축제 전체의 현재 혼잡도입니다."
            />
            <DashboardMetric
              value={`${dashboard?.averageWaitMinutes ?? MOCK_SUMMARY.estimatedWaitMinutes} 분`}
              valueClassName="body-regular-bold"
              label="예상 대기시간"
              description="전체 부스의 평균 예상 대기시간입니다."
            />
            <DashboardMetric
              className="border-r-[1.5px] border-zinc-300 pr-6"
              value={
                <>
                  <span className="body-regular-bold mr-1 text-primary">1</span>
                  {MOCK_SUMMARY.busiestBoothName.replace(/^1/, "")}
                </>
              }
              label="가장 혼잡한 부스"
              description="현재 대기시간이 가장 긴 부스입니다."
            />
            <DashboardMetric
              className="ml-1"
              value={`${MOCK_SUMMARY.dailyVisitorCount.toLocaleString()} 명`}
              valueClassName="body-regular-bold"
              label="일일 예상 방문자수"
              description="오늘 방문할 것으로 예상되는 방문자수입니다."
            />
            <DashboardMetric
              value={`${MOCK_SUMMARY.totalVisitorCount.toLocaleString()} 명`}
              valueClassName="body-regular-bold"
              label="누적 방문자수"
              description="축제 기간 동안 집계된 누적 방문자수입니다."
            />
          </div>
        )}
      </div>

      {!selectedBooth ? (
        <AiSuggestionPanel
          suggestions={activeSuggestions}
          onDismiss={(id) => setDismissedSuggestionIds((ids) => [...ids, id])}
          className="absolute top-10 left-[340px]"
        />
      ) : null}
    </div>
  );
}
