import type { LocalBoothPin } from "./geometryWgs84";
import type { ZoneGroup } from "./zonePayload";

/** 선택 항목 중 서버 구역의 구성원이 될 수 있는 부스만 반환한다. */
export function selectGroupableBooths(booths: LocalBoothPin[], selectedIds: Iterable<string>) {
  const selected = new Set(selectedIds);
  return booths.filter((booth) => selected.has(booth.id) && booth.nodeType === "BOOTH");
}

/** 새 구역의 부스를 기존 구역에서 빼고 새 구역에 정확히 한 번만 넣는다. */
export function moveBoothsToNewZone(zones: ZoneGroup[], zone: ZoneGroup): ZoneGroup[] {
  const memberIds = new Set(zone.boothIds);
  return [
    ...zones
      .map((existing) => ({
        ...existing,
        boothIds: existing.boothIds.filter((id) => !memberIds.has(id)),
      }))
      .filter((existing) => existing.boothIds.length > 0),
    { ...zone, boothIds: [...memberIds] },
  ];
}
