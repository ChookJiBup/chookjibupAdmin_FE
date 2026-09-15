import type { CongestionLevel } from "@/features/dashboard/types";
import type { LatLng } from "./latLng";

/**
 * 대기줄 레이어에 넘기는 항목과 그 계산. 지도 라이브러리와 무관한 순수 함수만 둔다.
 * (카카오 `QueuePathLayer.tsx`에 있던 것을 Leaflet 레이어와 화면에서 같이 쓰려고 옮겨 왔다.)
 */
export interface QueuePathItem {
  queueId: string;
  boothId: string;
  path: LatLng[] | null;
  waitMinutes: number | null | undefined;
  congestionLevel?: CongestionLevel | null;
  boothLat: number;
  boothLng: number;
}

export function boothsToQueuePathItems(
  booths: Array<{
    boothId: string;
    lat?: number;
    lng?: number;
    waitMinutes?: number | null;
    congestionLevel?: CongestionLevel | null;
  }>,
  queueByBoothId: Map<string, { queueId: string; path: LatLng[] | null }>,
): QueuePathItem[] {
  return booths.flatMap((booth) => {
    if (booth.lat === undefined || booth.lng === undefined) return [];
    const queue = queueByBoothId.get(booth.boothId);
    return [
      {
        queueId: queue?.queueId ?? `wait-${booth.boothId}`,
        boothId: booth.boothId,
        path: queue?.path ?? null,
        waitMinutes: booth.waitMinutes ?? null,
        congestionLevel: booth.congestionLevel ?? null,
        boothLat: booth.lat,
        boothLng: booth.lng,
      },
    ];
  });
}

/** 선으로 그릴 수 있는 대기줄 경로. 점이 둘 미만이면 null. */
export function drawableQueuePath(queue: QueuePathItem): LatLng[] | null {
  return queue.path && queue.path.length >= 2 ? queue.path : null;
}

/** 대기줄 끝(없으면 부스 자리)에 대기시간 표를 단다. */
export function queueLabelPositionOf(queue: QueuePathItem): LatLng {
  const path = drawableQueuePath(queue);
  return path ? path[path.length - 1] : { lat: queue.boothLat, lng: queue.boothLng };
}
