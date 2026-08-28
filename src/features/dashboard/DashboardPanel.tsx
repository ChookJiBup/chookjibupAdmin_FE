"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil1Icon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { ensureCoordinateMap, getMapEditor } from "@/features/boothmap/api";
import { nodeToLocalBooth } from "@/features/boothmap/geometryWgs84";
import { primaryFestivalCenter } from "@/features/boothmap/mapCenter";
import { getManagedFestival } from "@/features/festivals/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { getFestivalDashboard } from "./api";
import { BoothMapView } from "./BoothMapView";
import { BoothTreeSidebar } from "./BoothTreeSidebar";
import { DashboardStatsBar } from "./DashboardStatsBar";
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
    // 축제 장소에 위경도가 없으면 지도 준비 API가 400을 준다. 재시도해도 결과가 같으므로 한 번만 시도한다.
    retry: false,
  });
  const mapBooths = useMemo((): Booth[] => {
    return (mapDataQuery.data?.editor.nodes ?? [])
      .filter((node) => node.nodeType === "BOOTH")
      .map(nodeToLocalBooth)
      .filter((pin): pin is NonNullable<typeof pin> => pin !== null)
      .map((pin) => ({
        boothId: pin.nodeId ?? pin.id,
        name: pin.name,
        zoneId: "map",
        lat: pin.lat,
        lng: pin.lng,
      }));
  }, [mapDataQuery.data?.editor.nodes]);
  const mapZones = useMemo((): BoothZone[] => {
    if (mapBooths.length === 0) {
      return [];
    }
    return [{ zoneId: "map", name: "부스", booths: mapBooths }];
  }, [mapBooths]);
  const dashboardMapCenter =
    mapDataQuery.data?.editor.center ?? mapDataQuery.data?.map.center ?? mapCenter;
  const dashboardQuery = useQuery({
    queryKey: ["festival-dashboard", festivalId],
    queryFn: () => getFestivalDashboard(festivalId),
  });

  // 지도가 네비바 바로 아래부터 화면 전체를 채우도록 콘솔 콘텐츠 영역의 여백을 없앤다(디자인 스펙).
  useEffect(() => {
    setFullBleed(true);
    return () => setFullBleed(false);
  }, [setFullBleed]);

  if (festivalQuery.isLoading || mapDataQuery.isLoading || dashboardQuery.isLoading) {
    return <DashboardState message="대시보드를 불러오는 중..." />;
  }

  // 지도를 못 불러와도 방문자수 등 운영 지표는 보여줘야 하므로 지도 실패는 화면 전체를 막지 않는다.
  const queryError = festivalQuery.error ?? dashboardQuery.error;
  if (queryError) {
    return (
      <DashboardState
        error
        message={getApiErrorMessage(queryError, "대시보드를 불러오지 못했습니다.")}
      />
    );
  }

  const dashboard = dashboardQuery.data;
  const canEditMap = festivalQuery.data?.festivalStatus === "DRAFT";
  const mapErrorMessage = mapDataQuery.isError
    ? getApiErrorMessage(mapDataQuery.error, "부스맵을 불러오지 못했습니다.")
    : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <BoothMapView
        booths={mapBooths}
        selectedBooth={selectedBooth}
        onSelectBooth={setSelectedBooth}
        zoomStep={zoomStep}
        center={dashboardMapCenter}
      />

      {mapErrorMessage ? (
        <div className="absolute top-10 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-md">
          <p className="body-small-bold text-zinc-950">{mapErrorMessage}</p>
          <p className="body-caption mt-1 text-zinc-500">
            축제 장소에 위도·경도가 없으면 부스맵을 만들 수 없습니다. 축제관리에서 주소를 다시
            검색해 좌표를 저장해 주세요.
          </p>
        </div>
      ) : null}

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
        disabled={!canEditMap}
        title={canEditMap ? undefined : "축제 초안 상태에서만 부스맵을 수정할 수 있습니다."}
        onClick={() => {
          if (canEditMap) router.push(`/console/festivals/${festivalId}/boothmap`);
        }}
      >
        {canEditMap ? "수정하기" : "수정 불가"}
      </Button>

      <MapZoomControls
        className="absolute right-8 bottom-[142px] [&_button]:shadow-md"
        onZoomIn={() => setZoomStep((step) => step - 1)}
        onZoomOut={() => setZoomStep((step) => step + 1)}
      />

      <div className="absolute right-8 bottom-10 left-[340px]">
        {selectedBooth ? (
          <DashboardStatsBar selectedBooth={selectedBooth} />
        ) : dashboard?.dataAvailable ? (
          <div className="flex items-center gap-6 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-md">
            <DashboardMetric
              value={
                dashboard.currentVisitorCount === null
                  ? "데이터 없음"
                  : `${dashboard.currentVisitorCount.toLocaleString()} 명`
              }
              valueClassName="body-regular-bold"
              label="현재 방문자수"
              description="백엔드에서 집계한 현재 방문자수입니다."
            />
            <DashboardMetric
              value={
                dashboard.activeQueueCount === null
                  ? "데이터 없음"
                  : `${dashboard.activeQueueCount.toLocaleString()} 개`
              }
              valueClassName="body-regular-bold"
              label="활성 대기열"
              description="현재 활성화된 대기열 수입니다."
            />
            <DashboardMetric
              value={
                dashboard.averageWaitMinutes === null
                  ? "데이터 없음"
                  : `${dashboard.averageWaitMinutes.toLocaleString()} 분`
              }
              valueClassName="body-regular-bold"
              label="평균 대기시간"
              description="현재 활성 대기열의 평균 대기시간입니다."
            />
            <DashboardMetric
              value={dashboard.operatingStatus}
              valueClassName="body-regular-bold"
              label="운영 상태"
              description="백엔드에서 제공하는 현재 운영 상태입니다."
            />
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-md">
            <p className="body-small-bold text-zinc-950">
              아직 연결된 실시간 운영 지표가 없습니다.
            </p>
            <p className="body-caption mt-1 text-zinc-500">
              지도와 부스 위치만 확인할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardState({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-50">
      <p className={error ? "body-small text-error" : "body-small text-zinc-500"}>{message}</p>
    </div>
  );
}
