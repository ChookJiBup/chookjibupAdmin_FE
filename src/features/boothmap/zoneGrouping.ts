import type { LocalBoothPin } from "./geometryWgs84";
import type { ZoneGroup } from "./zonePayload";

export interface MapPoint {
  lat: number;
  lng: number;
}

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

/** 선택한 모든 부스를 내부에 포함하는 사각 경계를 만든다. */
export function groupBoundary(members: Pick<LocalBoothPin, "lat" | "lng">[], pad = 0.00015) {
  if (members.length === 0) return [];
  const lats = members.map((member) => member.lat);
  const lngs = members.map((member) => member.lng);
  const north = Math.max(...lats) + pad;
  const south = Math.min(...lats) - pad;
  const east = Math.max(...lngs) + pad;
  const west = Math.min(...lngs) - pad;
  return [
    { lat: north, lng: west },
    { lat: north, lng: east },
    { lat: south, lng: east },
    { lat: south, lng: west },
  ] satisfies MapPoint[];
}

export function boundaryContainsPoint(boundary: MapPoint[], point: MapPoint) {
  if (boundary.length === 0) return false;
  const lats = boundary.map(({ lat }) => lat);
  const lngs = boundary.map(({ lng }) => lng);
  return (
    point.lat >= Math.min(...lats) &&
    point.lat <= Math.max(...lats) &&
    point.lng >= Math.min(...lngs) &&
    point.lng <= Math.max(...lngs)
  );
}
