"use client";

import { useEffect, useMemo, useState } from "react";
import type { CongestionLevel } from "@/features/dashboard/types";
import { formatWaitMinutes } from "@/lib/formatWaitMinutes";
import { useLeafletMap } from "@/lib/map/mapContext";
import { MapOverlay } from "@/lib/map/MapOverlay";
import { MapPolygon, MapPolyline } from "@/lib/map/MapVectors";
import type { LatLng } from "./latLng";
import { drawableQueuePath, queueLabelPositionOf, type QueuePathItem } from "./queuePathItems";

/** 대기시간 표가 서로 닿지 않는다고 볼 최소 간격(px). 표 하나의 크기에서 왔다. */
const LABEL_GAP_X = 64;
const LABEL_GAP_Y = 28;

const LABEL_CLASSES: Record<CongestionLevel, string> = {
  LOW: "bg-secondary-600 text-white",
  MEDIUM: "bg-point-500 text-white",
  HIGH: "bg-red-600 text-white",
};

export interface LeafletQueuePathLayerProps {
  queues: QueuePathItem[];
  /** 참고용 QUEUE 노드. 운영 줄과 겹쳐도 자동 승격하지 않는다. */
  referenceLines?: Array<{ id: string; points: LatLng[]; geometryType: "POLYGON" | "POLYLINE" }>;
  showWaitLabel?: boolean;
}

/**
 * 운영 대기줄과 대기시간. 경로가 없으면 선만 숨기고 시간은 남긴다.
 * 카카오 `QueuePathLayer`의 Leaflet 버전이다. `LeafletMap` 안에 둔다.
 */
export function LeafletQueuePathLayer({
  queues,
  referenceLines = [],
  showWaitLabel = true,
}: LeafletQueuePathLayerProps) {
  return (
    <>
      {referenceLines.map((line) =>
        line.geometryType === "POLYGON" ? (
          <MapPolygon
            key={`ref-${line.id}`}
            path={line.points}
            strokeWeight={3}
            strokeColor="#71717a"
            strokeOpacity={0.7}
            fillOpacity={0.05}
          />
        ) : line.points.length >= 2 ? (
          <MapPolyline
            key={`ref-${line.id}`}
            path={line.points}
            strokeWeight={3}
            strokeColor="#71717a"
            strokeOpacity={0.7}
            strokeStyle="dash"
          />
        ) : null,
      )}
      {queues.map((queue) => (
        <QueuePathItemView key={queue.queueId} queue={queue} />
      ))}
      {showWaitLabel ? <WaitLabelLayer queues={queues} /> : null}
    </>
  );
}

/**
 * 대기시간 표. 서로 닿는 것은 접어서 한 자리에 하나만 남긴다.
 *
 * <p>부스마다 표를 달았더니 부스가 몰린 자리에서 표가 계단처럼 쌓여 아무것도 읽히지
 * 않았다. 화면 좌표로 겹침을 확인해, 오래 기다리는 쪽을 남기고 나머지는 접는다.
 * 접힌 부스도 눌러 보면 이름과 대기시간이 그대로 나온다.</p>
 */
function WaitLabelLayer({ queues }: { queues: QueuePathItem[] }) {
  const map = useLeafletMap()?.map ?? null;
  // 지도를 움직이거나 확대하면 겹침이 달라지므로 그때마다 다시 고른다.
  const [viewTick, setViewTick] = useState(0);

  useEffect(() => {
    if (!map) return;
    // 카카오 'idle'과 같이 이동·확대가 끝났을 때 한 번. 줌이 끝나도 moveend가 온다.
    const handleMoveEnd = () => setViewTick((tick) => tick + 1);
    map.on("moveend", handleMoveEnd);
    return () => {
      map.off("moveend", handleMoveEnd);
    };
  }, [map]);

  const labelled = useMemo(() => {
    const withWait = queues.filter((queue) => queue.waitMinutes != null);
    if (!map) return withWait;
    const placed: { x: number; y: number }[] = [];
    return (
      withWait
        // 오래 기다리는 부스를 먼저 놓아, 접히더라도 급한 쪽이 남게 한다.
        .toSorted((a, b) => (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0))
        .filter((queue) => {
          const anchor = queueLabelPositionOf(queue);
          const point = map.latLngToContainerPoint([anchor.lat, anchor.lng]);
          const overlaps = placed.some(
            (taken) =>
              Math.abs(taken.x - point.x) < LABEL_GAP_X &&
              Math.abs(taken.y - point.y) < LABEL_GAP_Y,
          );
          if (overlaps) return false;
          placed.push({ x: point.x, y: point.y });
          return true;
        })
    );
    // viewTick은 지도 이동을 알리는 신호라 계산에 직접 쓰이지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, queues, viewTick]);

  return (
    <>
      {labelled.map((queue) => (
        <MapOverlay
          key={`wait-${queue.queueId}`}
          position={queueLabelPositionOf(queue)}
          xAnchor={0}
          yAnchor={0}
          zIndex={18}
        >
          {/*
            표는 읽기만 하는 것이라 클릭을 받지 않아야 한다. 오버레이가 내용 크기만큼 자리를
            차지하면 표에 가려진 부스 마커를 누를 수 없다(부스가 몰린 자리에서는 절반 가까이
            눌리지 않았다). 자리를 차지하지 않는 0×0 상자에 담고 표는 그 위에 띄운다.
          */}
          <span className="pointer-events-none relative block size-0">
            <span
              className={`body-caption absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 whitespace-nowrap shadow-sm ${
                queue.congestionLevel
                  ? LABEL_CLASSES[queue.congestionLevel]
                  : "bg-white text-zinc-950"
              }`}
            >
              {formatWaitMinutes(queue.waitMinutes)}
            </span>
          </span>
        </MapOverlay>
      ))}
    </>
  );
}

function QueuePathItemView({ queue }: { queue: QueuePathItem }) {
  const path = drawableQueuePath(queue);
  if (!path) return null;
  return <MapPolyline path={path} strokeWeight={4} strokeColor="#fd7e14" strokeOpacity={0.95} />;
}
