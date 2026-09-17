import type { LatLng } from "./latLng";

const METERS_PER_DEGREE_LAT = 111320;

export type PolygonPreset = "triangle" | "square" | "circle";

/** 원형은 서버가 다각형만 받으므로 꼭짓점 16개로 근사한다. */
const CIRCLE_SEGMENTS = 16;

/** 기준점 주변을 평면(m)으로 펴서 계산한다. 축제장 크기에서는 오차가 무시할 만하다. */
function toMeters(origin: LatLng, point: LatLng) {
  return {
    x:
      (point.lng - origin.lng) *
      METERS_PER_DEGREE_LAT *
      Math.max(Math.cos((origin.lat * Math.PI) / 180), 0.01),
    y: (point.lat - origin.lat) * METERS_PER_DEGREE_LAT,
  };
}

function fromMeters(origin: LatLng, x: number, y: number): LatLng {
  return {
    lat: origin.lat + y / METERS_PER_DEGREE_LAT,
    lng:
      origin.lng +
      x / (METERS_PER_DEGREE_LAT * Math.max(Math.cos((origin.lat * Math.PI) / 180), 0.01)),
  };
}

/** 점들을 이은 길이(m). 폴리곤이면 닫는 변까지 더한다. */
export function pathLengthMeters(points: LatLng[], closed = false) {
  if (points.length < 2) return 0;
  const origin = points[0];
  const flat = points.map((point) => toMeters(origin, point));
  const segments = closed ? flat.length : flat.length - 1;
  let total = 0;
  for (let i = 0; i < segments; i++) {
    const a = flat[i];
    const b = flat[(i + 1) % flat.length];
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return total;
}

/** 폴리곤 면적(㎡). 꼬인 도형은 부호가 섞여 작게 나올 수 있다. */
export function polygonAreaSquareMeters(points: LatLng[]) {
  if (points.length < 3) return 0;
  const origin = points[0];
  const flat = points.map((point) => toMeters(origin, point));
  let twice = 0;
  for (let i = 0; i < flat.length; i++) {
    const a = flat[i];
    const b = flat[(i + 1) % flat.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

/** 이웃한 두 점 사이 가운데. 변 가운데 손잡이 위치로 쓴다. */
export function midpointOf(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

/**
 * 지금 도형이 차지하는 범위를 유지한 채 정해진 모양으로 꼭짓점을 다시 만든다.
 * 크기는 가로·세로 중 긴 쪽을 쓰고, 너무 작으면 20m로 잡는다.
 */
export function presetPolygonPoints(points: LatLng[], preset: PolygonPreset): LatLng[] {
  const center = {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lng: points.reduce((sum, point) => sum + point.lng, 0) / points.length,
  };
  const flat = points.map((point) => toMeters(center, point));
  const width = Math.max(...flat.map((p) => p.x)) - Math.min(...flat.map((p) => p.x));
  const height = Math.max(...flat.map((p) => p.y)) - Math.min(...flat.map((p) => p.y));
  const half = Math.max(width, height, 20) / 2;

  if (preset === "square") {
    return [
      fromMeters(center, -half, half),
      fromMeters(center, half, half),
      fromMeters(center, half, -half),
      fromMeters(center, -half, -half),
    ];
  }
  const count = preset === "triangle" ? 3 : CIRCLE_SEGMENTS;
  return Array.from({ length: count }, (_, index) => {
    // 삼각형은 꼭짓점 하나가 위를 향하게 90도에서 시작한다.
    const angle = Math.PI / 2 - (index * 2 * Math.PI) / count;
    return fromMeters(center, half * Math.cos(angle), half * Math.sin(angle));
  });
}

/** 꺾인 통로를 양 끝점만 남긴 직선으로 편다. */
export function straightenLine(points: LatLng[]): LatLng[] {
  return points.length <= 2 ? points : [points[0], points[points.length - 1]];
}
