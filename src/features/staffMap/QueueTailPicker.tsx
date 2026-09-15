"use client";

import { useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { LeafletMap } from "@/lib/map/LeafletMap";
import { kakaoLevelToZoom } from "@/lib/map/mapConfig";
import { MapOverlay } from "@/lib/map/MapOverlay";
import { MapPolyline } from "@/lib/map/MapVectors";
import { distanceInMeters } from "./utils";

// 지도 레벨은 카카오 레벨 기준 `2 + zoomStep`이고 이 지도는 레벨 1~8만 허용한다.
const MIN_LEVEL = 1;
const MAX_LEVEL = 8;
const MIN_ZOOM_STEP = MIN_LEVEL - 2;
const MAX_ZOOM_STEP = MAX_LEVEL - 2;

function clampZoomStep(step: number) {
  return Math.min(Math.max(step, MIN_ZOOM_STEP), MAX_ZOOM_STEP);
}

export interface QueueTailPoint {
  lat: number;
  lng: number;
}

export interface QueueTailPickerProps {
  boothName: string;
  /** 부스 좌표. 없으면 줄 길이를 계산할 수 없어 거리 안내를 숨긴다. */
  boothPoint: QueueTailPoint | null;
  /** 지도 초기 중심. 부스 좌표가 없는 축제에서도 지도를 띄울 수 있게 따로 받는다. */
  center: QueueTailPoint;
  /** 이미 기록된 줄끝 좌표. 다시 열었을 때 그 자리에서 시작한다. */
  initialTail: QueueTailPoint | null;
  onCancel: () => void;
  onConfirm: (point: QueueTailPoint) => void;
}

/**
 * 줄 끝 지점을 지도에서 직접 찍는 전체 화면 시트.
 *
 * 구역 중심만 고를 수 있던 시절에는 실제 줄 길이와 무관한 거리가 서버로 넘어가
 * "여유"를 보고할 방법이 아예 없었다. 스태프가 서 있는 자리를 그대로 찍게 한다.
 */
export function QueueTailPicker({
  boothName,
  boothPoint,
  center,
  initialTail,
  onCancel,
  onConfirm,
}: QueueTailPickerProps) {
  const [tail, setTail] = useState<QueueTailPoint | null>(initialTail);
  const [zoomStep, setZoomStep] = useState(MIN_ZOOM_STEP);

  const meters = boothPoint && tail ? distanceInMeters(boothPoint, tail) : null;

  return (
    // 스태프 화면은 402px 폭 안에서 동작하므로 그 폭에 맞춰 화면 전체를 덮는다.
    <div className="fixed inset-0 z-40 mx-auto flex w-full max-w-[402px] flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <div className="min-w-0">
          <p className="body-regular-bold truncate text-zinc-950">{boothName}</p>
          <p className="body-caption text-zinc-500">줄이 끝나는 지점을 지도에서 눌러주세요.</p>
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="줄 끝 선택 닫기"
          icon={<Cross2Icon />}
          onClick={onCancel}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <QueueTailMapArea
          center={center}
          zoomStep={zoomStep}
          boothPoint={boothPoint}
          tail={tail}
          onPick={setTail}
        />
        <MapZoomControls
          className="absolute top-5 left-5 z-10 [&_button]:size-9 [&_button]:shadow-md"
          zoomInDisabled={zoomStep <= MIN_ZOOM_STEP}
          zoomOutDisabled={zoomStep >= MAX_ZOOM_STEP}
          onZoomIn={() => setZoomStep((step) => clampZoomStep(step - 1))}
          onZoomOut={() => setZoomStep((step) => clampZoomStep(step + 1))}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-zinc-200 px-4 pt-3 pb-8">
        <p className="body-small text-zinc-950" role="status">
          {tail
            ? meters === null
              ? "줄 끝 지점을 선택했습니다."
              : `부스에서 약 ${meters}m 지점을 선택했습니다.`
            : "아직 줄 끝 지점을 선택하지 않았습니다."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            취소
          </Button>
          <Button
            className="flex-1"
            disabled={!tail}
            onClick={() => {
              if (tail) onConfirm(tail);
            }}
          >
            이 지점으로 지정
          </Button>
        </div>
      </div>
    </div>
  );
}

function QueueTailMapArea({
  center,
  zoomStep,
  boothPoint,
  tail,
  onPick,
}: {
  center: QueueTailPoint;
  zoomStep: number;
  boothPoint: QueueTailPoint | null;
  tail: QueueTailPoint | null;
  onPick: (point: QueueTailPoint) => void;
}) {
  return (
    <LeafletMap
      center={center}
      zoom={kakaoLevelToZoom(2 + zoomStep)}
      minZoom={kakaoLevelToZoom(MAX_LEVEL)}
      maxZoom={kakaoLevelToZoom(MIN_LEVEL)}
      scrollWheelZoom={false}
      // 줄 끝을 찍을 때 기본 더블클릭 확대가 같이 걸리지 않게 한다.
      doubleClickZoom={false}
      className="isolate h-full w-full"
      // 손가락으로 지도를 끈 뒤에는 Leaflet이 click을 보내지 않아, 끌기와 찍기가 섞이지 않는다.
      onClick={onPick}
    >
      {boothPoint && tail ? (
        <MapPolyline
          path={[boothPoint, tail]}
          strokeColor="#FD7E14"
          strokeWeight={4}
          strokeOpacity={0.9}
        />
      ) : null}
      {boothPoint ? (
        <MapOverlay position={boothPoint} zIndex={10}>
          <span
            role="img"
            aria-label="부스 위치"
            className="block size-3 rounded-full border border-white bg-zinc-950 shadow-sm"
          />
        </MapOverlay>
      ) : null}
      {tail ? (
        <MapOverlay position={tail} zIndex={20}>
          <span
            role="img"
            aria-label="선택한 줄 끝 위치"
            className="block size-4 rounded-full border-2 border-white bg-point-600 shadow-md"
          />
        </MapOverlay>
      ) : null}
    </LeafletMap>
  );
}
