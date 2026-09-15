import type { Map as LeafletMapInstance } from "leaflet";

/**
 * 지도 좌표 헬퍼. leaflet은 타입만 가져오므로 서버에서 평가돼도 안전하다.
 * 좌표 형식은 백엔드와 같은 WGS84 `{ lat, lng }`를 그대로 쓴다.
 */
export interface MapLatLng {
  lat: number;
  lng: number;
}

/** 지도 컨테이너 왼쪽 위를 원점으로 한 화면 좌표(px). */
export interface MapPoint {
  x: number;
  y: number;
}

/** 위경도를 지도 컨테이너 기준 화면 좌표로 바꾼다. (카카오 `containerPointFromCoords`) */
export function latLngToContainerPoint(map: LeafletMapInstance, point: MapLatLng): MapPoint {
  const projected = map.latLngToContainerPoint([point.lat, point.lng]);
  return { x: projected.x, y: projected.y };
}

/**
 * 지도 컨테이너 기준 화면 좌표를 위경도로 바꾼다. (카카오 `coordsFromContainerPoint`)
 * 마우스 이벤트라면 `clientX - container.getBoundingClientRect().left`처럼 컨테이너 기준으로 넘긴다.
 */
export function containerPointToLatLng(map: LeafletMapInstance, point: MapPoint): MapLatLng {
  const latLng = map.containerPointToLatLng([point.x, point.y]);
  return { lat: latLng.lat, lng: latLng.lng };
}

/** 지도에 부스가 꽉 차 보이도록 맞출 때 남길 화면 여백(px). */
export const FIT_BOUNDS_PADDING = 56;

/**
 * 점 전체가 화면에 들어오도록 지도 범위를 맞춘다. (카카오 `fitBoothBounds`와 같은 동작)
 *
 * 배율을 고정값으로 두면 축제 규모에 따라 결과가 갈린다. 부스가 78m 안에 몰린
 * 축제는 너무 멀어 점 하나로 뭉쳐 보이고, 270m로 퍼진 축제는 양끝이 화면 밖으로
 * 나간다. 그래서 분포에 맞춰 맞춘다.
 *
 * 점이 하나뿐이면 범위가 한 점이라 배율이 최대까지 튀므로 그때는 맞추지 않는다.
 * 카카오 `setBounds`처럼 애니메이션 없이 바로 옮기고, 네 변 모두 같은 여백을 둔다.
 */
export function fitMapBounds(
  map: LeafletMapInstance | null,
  points: MapLatLng[],
  padding: number = FIT_BOUNDS_PADDING,
): boolean {
  if (!map || points.length < 2) return false;
  map.fitBounds(
    points.map((point) => [point.lat, point.lng] as [number, number]),
    { padding: [padding, padding], animate: false },
  );
  return true;
}
