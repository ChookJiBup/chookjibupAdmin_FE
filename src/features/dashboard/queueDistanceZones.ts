/** 현장 존 번호를 대기열 보고 거리로 바꾸는 공통 기준. */
export const QUEUE_ZONE_METERS = 10;

export const QUEUE_DISTANCE_ZONES = [
  { id: "0", label: "줄 없음", meters: 0 },
  ...Array.from({ length: 20 }, (_, index) => ({
    id: String(index + 1),
    label: `존 ${index + 1}`,
    meters: (index + 1) * QUEUE_ZONE_METERS,
  })),
];

/** 서버는 좌표 사이의 거리를 다시 계산하므로 선택한 존만큼 떨어진 끝점을 보낸다. */
export function queueTailPointForMeters(point: { lat: number; lng: number }, meters: number) {
  return { lat: point.lat + meters / 111_320, lng: point.lng };
}
