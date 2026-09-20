import { queueSegmentLength } from "@/features/boothmap/queueSnap";
import type { QueuePathPoint } from "@/features/staffMap/types";

/** 존 한 칸이 나타내는 줄 길이. */
export const QUEUE_ZONE_METERS = 10;

export interface QueueZone {
  id: string;
  label: string;
  meters: number;
}

/** 사전 동선이 없는 부스에서 쓰는 눈대중 존 개수. */
const FALLBACK_ZONE_COUNT = 20;

const NO_QUEUE: QueueZone = { id: "0", label: "줄 없음", meters: 0 };

/**
 * 현장에서 고를 존 목록.
 *
 * 사전 동선이 있으면 그 줄 길이만큼만 만든다. 60m짜리 줄에 존 20(200m)까지 열어 두면
 * 실제로는 설 수 없는 길이가 보고되기 때문이다. 마지막 칸은 10m로 떨어지지 않으므로
 * 줄 끝까지의 길이를 그대로 쓴다.
 *
 * 동선이 없으면 예전처럼 10m 단위 20칸을 눈대중으로 고른다.
 */
export function buildQueueZones(lengthMeters?: number | null): QueueZone[] {
  const usable =
    lengthMeters != null && Number.isFinite(lengthMeters) && lengthMeters > 0 ? lengthMeters : null;
  const count = usable === null ? FALLBACK_ZONE_COUNT : Math.ceil(usable / QUEUE_ZONE_METERS);
  return [
    NO_QUEUE,
    ...Array.from({ length: count }, (_, index) => {
      const meters = (index + 1) * QUEUE_ZONE_METERS;
      return {
        id: String(index + 1),
        label: `존 ${index + 1}`,
        meters: usable === null ? meters : Math.min(meters, Math.round(usable)),
      };
    }),
  ];
}

/**
 * 사전 동선을 따라 `meters`만큼 걸어간 지점.
 *
 * 존 번호가 실제 줄 위의 한 점을 가리키게 해서, 줄이 꺾여 있어도 서버가 그 지점까지의
 * 경로 길이를 그대로 되짚을 수 있다.
 */
export function queueTailPointOnPath(path: QueuePathPoint[], meters: number): QueuePathPoint {
  if (path.length === 0) throw new Error("사전 동선이 비어 있습니다.");
  if (meters <= 0) return path[0];
  let remaining = meters;
  for (let index = 1; index < path.length; index++) {
    const from = path[index - 1];
    const to = path[index];
    const segment = queueSegmentLength(from, to);
    if (segment >= remaining) {
      const ratio = segment === 0 ? 0 : remaining / segment;
      return {
        lat: from.lat + (to.lat - from.lat) * ratio,
        lng: from.lng + (to.lng - from.lng) * ratio,
      };
    }
    remaining -= segment;
  }
  return path[path.length - 1];
}

/**
 * 사전 동선이 없을 때 쓰는 줄끝 좌표.
 *
 * 줄이 어느 쪽으로 서는지 알 수 없어 부스 정북쪽으로 거리만 맞춘 점을 만든다. 서버는
 * 함께 보내는 보고 거리로만 대기시간을 계산하므로 값 자체는 문제가 없지만, 방향은
 * 실제와 무관하므로 이 좌표로 지도에 줄을 그리면 안 된다.
 */
export function queueTailPointForMeters(point: { lat: number; lng: number }, meters: number) {
  return { lat: point.lat + meters / 111_320, lng: point.lng };
}
