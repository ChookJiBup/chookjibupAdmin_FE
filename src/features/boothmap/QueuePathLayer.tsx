"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomOverlayMap, Polygon, Polyline, useMap } from "react-kakao-maps-sdk";
import type { CongestionLevel } from "@/features/dashboard/types";
import { formatWaitMinutes } from "@/lib/formatWaitMinutes";
import type { LatLng } from "./latLng";

export interface QueuePathItem {
  queueId: string;
  boothId: string;
  path: LatLng[] | null;
  /**
   * 줄 끝 좌표. 경로(`path`) 없이 줄 끝만 저장하는 스태프 화면을 위해 받는다.
   * 경로가 없을 때 부스에서 이 지점까지 직선을 그려 «현재 줄»을 보여 준다.
   */
  tail?: LatLng | null;
  /**
   * 줄 끝 좌표가 실제 방향을 담고 있는지. 사전 동선이 없는 부스는 거리만 보고하고
   * 좌표는 부스 정북쪽으로 맞춰 만들기 때문에, 그 좌표로 선을 그으면 엉뚱한 쪽으로
   * 뻗는다. 그런 줄은 선을 그리지 않고 대기시간 표만 남긴다.
   */
  tailDirectionKnown?: boolean;
  waitMinutes: number | null | undefined;
  congestionLevel?: CongestionLevel | null;
  boothLat: number;
  boothLng: number;
}

/*
  대기줄 선 색. 카카오 Polyline은 CSS 클래스를 받지 못해 값으로 줄 수밖에 없다.
  globals.css의 `point-600`(#FD7E14)과 같은 색이다.
*/
export const QUEUE_LINE_COLOR = "#FD7E14";
export const QUEUE_LINE_WEIGHT = 4;

/** 대기시간 표가 서로 닿지 않는다고 볼 최소 간격(px). 표 하나의 크기에서 왔다. */
const LABEL_GAP_X = 64;
const LABEL_GAP_Y = 28;

const LABEL_CLASSES: Record<CongestionLevel, string> = {
  LOW: "bg-secondary-600 text-white",
  MEDIUM: "bg-point-500 text-white",
  HIGH: "bg-red-600 text-white",
};

export function boothsToQueuePathItems(
  booths: Array<{
    boothId: string;
    lat?: number;
    lng?: number;
    waitMinutes?: number | null;
    congestionLevel?: CongestionLevel | null;
  }>,
  queueByBoothId: Map<
    string,
    {
      queueId: string;
      path: LatLng[] | null;
      /** 줄 끝 좌표. 경로 없이 줄 끝만 저장하는 화면이 있어 선택 항목으로 받는다. */
      tailLatitude?: number | null;
      tailLongitude?: number | null;
      /** 서버가 줄 길이를 구한 방법. `REPORTED`는 거리만 보고돼 방향을 알 수 없다. */
      calculationMethod?: string | null;
      waitMinutes?: number | null;
      congestionLevel?: CongestionLevel | null;
    }
  >,
): QueuePathItem[] {
  return booths.flatMap((booth) => {
    if (booth.lat === undefined || booth.lng === undefined) return [];
    const queue = queueByBoothId.get(booth.boothId);
    return [
      {
        queueId: queue?.queueId ?? `wait-${booth.boothId}`,
        boothId: booth.boothId,
        path: queue?.path ?? null,
        tail:
          queue?.tailLatitude != null && queue?.tailLongitude != null
            ? { lat: queue.tailLatitude, lng: queue.tailLongitude }
            : null,
        tailDirectionKnown: queue?.calculationMethod !== "REPORTED",
        waitMinutes:
          queue?.waitMinutes !== undefined ? queue.waitMinutes : (booth.waitMinutes ?? null),
        congestionLevel:
          queue?.congestionLevel !== undefined
            ? queue.congestionLevel
            : (booth.congestionLevel ?? null),
        boothLat: booth.lat,
        boothLng: booth.lng,
      },
    ];
  });
}

export interface QueuePathLayerProps {
  queues: QueuePathItem[];
  /** 참고용 QUEUE 노드. 운영 줄과 겹쳐도 자동 승격하지 않는다. */
  referenceLines?: Array<{ id: string; points: LatLng[]; geometryType: "POLYGON" | "POLYLINE" }>;
  showWaitLabel?: boolean;
}

/** 운영 대기줄과 대기시간. 경로가 없으면 선만 숨기고 시간은 남긴다. */
export function QueuePathLayer({
  queues,
  referenceLines = [],
  showWaitLabel = true,
}: QueuePathLayerProps) {
  return (
    <>
      {referenceLines.map((line) =>
        line.geometryType === "POLYGON" ? (
          <Polygon
            key={`ref-${line.id}`}
            path={line.points}
            strokeWeight={3}
            strokeColor="#71717a"
            strokeOpacity={0.7}
            fillOpacity={0.05}
          />
        ) : line.points.length >= 2 ? (
          <Polyline
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
  const map = useMap();
  // 지도를 움직이거나 확대하면 겹침이 달라지므로 그때마다 다시 고른다.
  const [viewTick, setViewTick] = useState(0);

  useEffect(() => {
    if (!map) return;
    const handleIdle = () => setViewTick((tick) => tick + 1);
    kakao.maps.event.addListener(map, "idle", handleIdle);
    return () => kakao.maps.event.removeListener(map, "idle", handleIdle);
  }, [map]);

  const labelled = useMemo(() => {
    const withWait = queues.filter((queue) => queue.waitMinutes != null);
    if (!map) return withWait;
    const projection = map.getProjection();
    const placed: { x: number; y: number }[] = [];
    return (
      withWait
        // 오래 기다리는 부스를 먼저 놓아, 접히더라도 급한 쪽이 남게 한다.
        .toSorted((a, b) => (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0))
        .filter((queue) => {
          const anchor = labelPositionOf(queue);
          const point = projection.containerPointFromCoords(
            new kakao.maps.LatLng(anchor.lat, anchor.lng),
          );
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
        <CustomOverlayMap
          key={`wait-${queue.queueId}`}
          position={labelPositionOf(queue)}
          xAnchor={0}
          yAnchor={0}
          zIndex={18}
          clickable={false}
        >
          {/*
            표는 읽기만 하는 것이라 클릭을 받지 않아야 한다. 카카오 오버레이의
            clickable=false는 지도 조작만 통과시킬 뿐 DOM 클릭은 그대로 막는다. 게다가
            오버레이가 내용 크기만큼 자리를 차지해, 표에 가려진 부스 마커를 누를 수
            없었다(부스가 몰린 자리에서는 절반 가까이 눌리지 않았다). 자리를 차지하지 않는
            0×0 상자에 담고 표는 그 위에 띄운다.
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
        </CustomOverlayMap>
      ))}
    </>
  );
}

/**
 * 이 줄을 그릴 선. 경로가 있으면 그대로, 줄 끝만 있으면 부스에서 줄 끝까지 직선이다.
 *
 * 스태프 화면은 줄 끝 좌표 하나만 저장하는 계약이라(경로를 보내지 않는다) 경로만
 * 보던 시절에는 줄을 아무리 갱신해도 지도에 아무것도 그려지지 않았다.
 *
 * 다만 방향을 모르는 줄 끝은 선을 그리지 않는다. 거리만 보고된 좌표는 부스 정북쪽에
 * 찍히므로, 실제로 남쪽에 선 줄이 북쪽으로 뻗은 것처럼 보이던 문제가 있었다.
 */
function queueLineOf(queue: QueuePathItem): LatLng[] | null {
  if (queue.path && queue.path.length >= 2) return queue.path;
  if (!queue.tail || queue.tailDirectionKnown === false) return null;
  return [{ lat: queue.boothLat, lng: queue.boothLng }, queue.tail];
}

/** 대기줄 끝(없으면 부스 자리)에 표를 단다. */
function labelPositionOf(queue: QueuePathItem): LatLng {
  const line = queueLineOf(queue);
  return line ? line[line.length - 1] : { lat: queue.boothLat, lng: queue.boothLng };
}

function QueuePathItemView({ queue }: { queue: QueuePathItem }) {
  const line = queueLineOf(queue);
  if (!line) return null;
  return (
    <Polyline
      path={line}
      strokeWeight={QUEUE_LINE_WEIGHT}
      strokeColor={QUEUE_LINE_COLOR}
      strokeOpacity={0.95}
    />
  );
}
