"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BoothMapView } from "@/features/dashboard/BoothMapView";
import { boothsToQueuePathItems } from "@/features/boothmap/QueuePathLayer";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { QueueUpdateSheet } from "./QueueUpdateSheet";
import { StaffBoothBar } from "./StaffBoothBar";
import { StaffFestivalBar } from "./StaffFestivalBar";
import { useStaffFestival } from "./useStaffFestival";
import { averageWaitMinutes, busiestBooth, distanceInMeters, overallCongestion } from "./utils";

/*
  `BoothMapView`는 카카오 지도 레벨을 `2 + zoomStep`으로 계산한다. 스태프 화면은
  폭 402px 안에서 부스를 봐야 해서 콘솔 기본값보다 한 단계 더 확대한 레벨 1에서
  시작하고, 지도가 허용하는 레벨 1~8을 그대로 zoomStep 범위로 쓴다.

  범위를 넘겨 눌러도 지도 레벨은 그대로라, 예전에는 확대 버튼을 두 번 헛누르면
  축소 버튼도 세 번을 눌러야 겨우 축소되는 상태가 됐다. 여기서 값을 가두고
  한계에서는 버튼도 비활성화한다.
*/
const STAFF_MAP_MIN_LEVEL = 1;
const MIN_ZOOM_STEP = STAFF_MAP_MIN_LEVEL - 2;
const MAX_ZOOM_STEP = 8 - 2;

function clampZoomStep(step: number) {
  return Math.min(Math.max(step, MIN_ZOOM_STEP), MAX_ZOOM_STEP);
}

/*
  «전체»를 고른 상태를 나타내는 값. Radix Select는 빈 문자열을 항목 값으로 쓸 수 없어
  따로 둔다. 구역 id는 서버가 주는 UUID라 이 값과 겹치지 않는다.
*/
const ALL_ZONES_VALUE = "all";

export function StaffMapPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boothIdParam = searchParams.get("boothId");
  /*
    고른 구역은 URL 쿼리에 둔다. 이 화면은 이미 부스 선택을 `?boothId=`로 주고받고,
    현장에서는 화면을 껐다 켜거나 새로고침하는 일이 잦아 컴포넌트 state로 두면
    그때마다 선택이 풀린다. 전역 스토어까지 둘 만큼 여러 화면이 공유하는 값도 아니다.
  */
  const zoneIdParam = searchParams.get("zoneId");
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(boothIdParam);
  const [appliedBoothIdParam, setAppliedBoothIdParam] = useState<string | null>(boothIdParam);
  const [queueSheetOpen, setQueueSheetOpen] = useState(false);
  const [zoomStep, setZoomStep] = useState(MIN_ZOOM_STEP);
  const festival = useStaffFestival();

  /*
    부스검색에서 부스를 고르면 `?boothId=`만 바뀐 채로 이 화면에 들어온다. 이 화면은
    정적으로 미리 렌더되므로 첫 렌더의 쿼리는 비어 있을 수 있고, 마운트 시점의 값만
    쓰면 그 선택이 통째로 사라진다. 쿼리가 바뀔 때마다 선택에 반영한다.
  */
  if (boothIdParam !== appliedBoothIdParam) {
    setAppliedBoothIdParam(boothIdParam);
    setSelectedBoothId(boothIdParam);
    setQueueSheetOpen(false);
  }

  /*
    구역이 사라지거나 이름이 바뀐 축제에서 옛 링크를 열면 쿼리의 구역 id가 목록에 없을
    수 있다. 그때는 빈 지도를 보여 주지 말고 «전체»로 되돌린다.
  */
  const selectedZoneFilter = useMemo(
    () => festival.zones.find((zone) => zone.zoneId === zoneIdParam) ?? null,
    [festival.zones, zoneIdParam],
  );
  // 고른 구역에 속한 부스만 지도·요약에 남긴다. 고르지 않았으면 축제 전체다.
  const visibleBooths = selectedZoneFilter ? selectedZoneFilter.booths : festival.booths;

  const selectedBooth = useMemo(
    () => visibleBooths.find((booth) => booth.boothId === selectedBoothId) ?? null,
    [visibleBooths, selectedBoothId],
  );
  const selectedZone = useMemo(
    () => festival.zones.find((zone) => zone.zoneId === selectedBooth?.zoneId) ?? null,
    [festival.zones, selectedBooth],
  );
  const selectedQueue = selectedBooth
    ? festival.queueByBoothId.get(selectedBooth.boothId)
    : undefined;
  /*
    저장된 거리를 그대로 쓰되, 옛 기록처럼 거리 없이 좌표만 있으면 부스에서 다시 잰다.
  */
  const tailMeters = useMemo(() => {
    if (!selectedQueue) return null;
    if (selectedQueue.queueTailMeters !== null) return selectedQueue.queueTailMeters;
    if (selectedQueue.tailLatitude === null || selectedQueue.tailLongitude === null) return null;
    if (selectedBooth?.lat === undefined || selectedBooth?.lng === undefined) return null;
    return distanceInMeters(
      { lat: selectedBooth.lat, lng: selectedBooth.lng },
      { lat: selectedQueue.tailLatitude, lng: selectedQueue.tailLongitude },
    );
  }, [selectedBooth, selectedQueue]);

  const queues = useMemo(
    () => boothsToQueuePathItems(visibleBooths, festival.queueByBoothId),
    [visibleBooths, festival.queueByBoothId],
  );
  const fitPoints = useMemo(
    () =>
      visibleBooths
        .filter((booth) => booth.lat !== undefined && booth.lng !== undefined)
        .map((booth) => ({ lat: booth.lat as number, lng: booth.lng as number })),
    [visibleBooths],
  );

  /*
    구역을 고르면 그 구역 기준으로 다시 잰다. 축제 전체 평균 대기시간만 서버가
    내려주므로, 전체일 때만 그 값을 쓰고 구역일 때는 부스 값으로 직접 평균을 낸다.
  */
  const summary = selectedZoneFilter
    ? {
        congestionLevel: overallCongestion(visibleBooths),
        averageWaitMinutes: averageWaitMinutes(visibleBooths),
        busiestBooth: busiestBooth(visibleBooths),
      }
    : festival.summary;

  const handleZoneChange = (value: string) => {
    const nextZoneId = value === ALL_ZONES_VALUE ? null : value;
    const params = new URLSearchParams(searchParams.toString());
    if (nextZoneId) params.set("zoneId", nextZoneId);
    else params.delete("zoneId");

    /*
      고른 구역에 없는 부스는 지도에서 사라지는데, 하단바만 그 부스를 계속 보여 주면
      «지도에 없는 부스의 줄끝을 갱신»하는 상태가 된다. 선택도 함께 푼다.
    */
    const nextZone = nextZoneId
      ? festival.zones.find((zone) => zone.zoneId === nextZoneId)
      : undefined;
    const boothStaysVisible =
      !selectedBoothId ||
      !nextZone ||
      nextZone.booths.some((booth) => booth.boothId === selectedBoothId);
    if (!boothStaysVisible) {
      params.delete("boothId");
      setSelectedBoothId(null);
      setQueueSheetOpen(false);
    }

    const query = params.toString();
    router.replace(query ? `/staff/dashboard?${query}` : "/staff/dashboard", { scroll: false });
  };

  if (festival.isLoading) {
    return <StaffMapState message="담당 축제 정보를 불러오는 중..." />;
  }

  if (festival.error) {
    return (
      <StaffMapState
        error
        message={getApiErrorMessage(festival.error, "담당 축제 정보를 불러오지 못했습니다.")}
      />
    );
  }

  // 줄끝 존은 거리 기준으로 고르므로 지도 구역이 없어도 갱신할 수 있다.
  const queueDisabledReason = !selectedQueue
    ? festival.queuesError
      ? "대기열 정보를 불러오지 못해 줄끝을 갱신할 수 없습니다."
      : "이 부스에는 아직 대기열이 만들어지지 않았습니다."
    : null;

  if (!festival.mapCenter) {
    return <StaffMapState message="지도에 표시할 부스 좌표가 없습니다." />;
  }

  // 구역이 하나뿐인 축제(구역을 나누지 않았거나 전부 한 구역)에서는 고를 것이 없다.
  const showZoneFilter = festival.zones.length > 1;

  // 화면설계서 MAIN01/EDIT01은 지도를 화면 전체로 깔고 그 위에 하단바·줄끝갱신 모달을 얹는다.
  return (
    // 공통 여백(20)을 되돌려 지도를 화면 끝까지 채운다.
    <div className="relative -m-5 min-h-0 flex-1">
      <BoothMapView
        booths={visibleBooths}
        facilities={festival.facilities}
        selectedBooth={selectedBooth}
        onSelectBooth={(booth) => {
          setSelectedBoothId(booth?.boothId ?? null);
          setQueueSheetOpen(false);
        }}
        showPopup={false}
        zoomStep={zoomStep}
        minLevel={STAFF_MAP_MIN_LEVEL}
        center={festival.mapCenter}
        queues={queues}
        pamphlet={festival.pamphlet}
        boundary={festival.siteBoundary}
        fitPoints={fitPoints}
        // 구역을 바꿀 때만 범위를 다시 맞춘다(폴링으로 부스가 갱신될 때마다 튀면 안 된다).
        fitKey={selectedZoneFilter?.zoneId ?? null}
        onFitted={(level) => setZoomStep(clampZoomStep(level - 2))}
        onZoomByWheel={(direction) => setZoomStep((step) => clampZoomStep(step + direction))}
      />

      <MapZoomControls
        className="absolute top-5 left-5 z-10 [&_button]:size-9 [&_button]:shadow-md"
        zoomInDisabled={zoomStep <= MIN_ZOOM_STEP}
        zoomOutDisabled={zoomStep >= MAX_ZOOM_STEP}
        onZoomIn={() => setZoomStep((step) => clampZoomStep(step - 1))}
        onZoomOut={() => setZoomStep((step) => clampZoomStep(step + 1))}
      />

      {showZoneFilter ? (
        // 확대·축소가 왼쪽 위에 있어 반대편에 둔다. 402px 폭에서 서로 닿지 않는 너비다.
        <Select
          value={selectedZoneFilter?.zoneId ?? ALL_ZONES_VALUE}
          onValueChange={handleZoneChange}
        >
          {/* 구역명이 길어도 폭을 밀어내지 않도록 값 칸만 줄여 표시한다. */}
          <SelectTrigger
            aria-label="구역 선택"
            className="absolute top-5 right-5 z-10 w-36 shadow-md [&>span]:min-w-0 [&>span]:truncate"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-w-[240px]">
            <SelectItem value={ALL_ZONES_VALUE}>전체</SelectItem>
            {festival.zones.map((zone) => (
              <SelectItem key={zone.zoneId} value={zone.zoneId}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {selectedBooth && selectedQueue && queueSheetOpen ? (
        <QueueUpdateSheet
          // 부스가 바뀌면 선택한 줄끝 존을 초기화하기 위해 새로 마운트한다.
          key={selectedBooth.boothId}
          festivalId={festival.festivalId}
          booth={selectedBooth}
          queue={selectedQueue}
          mapCenter={festival.mapCenter}
          onClose={() => setQueueSheetOpen(false)}
          refreshing={festival.isRefetching}
          onUpdated={festival.refetch}
        />
      ) : selectedBooth ? (
        <StaffBoothBar
          booth={selectedBooth}
          zoneName={selectedZone?.name ?? "구역 미지정"}
          queueTailMeters={tailMeters}
          disabledReason={queueDisabledReason}
          onUpdateQueue={() => setQueueSheetOpen(true)}
        />
      ) : (
        <StaffFestivalBar
          // 요약 숫자가 구역 기준으로 바뀌므로 제목도 어느 범위인지 같이 밝힌다.
          title={
            selectedZoneFilter
              ? `${festival.festivalName || "현장 운영 현황"} · ${selectedZoneFilter.name}`
              : festival.festivalName || "현장 운영 현황"
          }
          congestionLevel={summary.congestionLevel}
          averageWaitMinutes={summary.averageWaitMinutes}
          busiestBooth={summary.busiestBooth}
        />
      )}
    </div>
  );
}

function StaffMapState({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <p className={error ? "body-small text-error" : "body-small text-zinc-500"}>{message}</p>
    </div>
  );
}
