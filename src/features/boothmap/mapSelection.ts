import type { LatLng } from "./latLng";

export interface LatLngBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface LatLngDelta {
  dLat: number;
  dLng: number;
}

/**
 * 드래그가 아니라 클릭으로 볼 기본 한계값.
 *
 * 에디터의 `isSamePlace`가 "지도 클릭 두 번이 사실상 같은 자리인지"를 가르는 값과 자릿수를 맞췄다.
 * 축제장 축척에서 0.000015도는 2m 이하라, 손이 흔들려 생긴 드래그는 클릭으로 흡수된다.
 */
const NEGLIGIBLE_DEGREES = 0.000015;

/** 드래그 박스 두 모서리로 범위를 만든다. 어느 방향으로 끌어도 같은 범위가 나온다. */
export function boundsFromCorners(a: LatLng, b: LatLng): LatLngBounds {
  return {
    south: Math.min(a.lat, b.lat),
    west: Math.min(a.lng, b.lng),
    north: Math.max(a.lat, b.lat),
    east: Math.max(a.lng, b.lng),
  };
}

/** 점이 범위 안에 있는지. 경계선 위는 안으로 친다. */
export function boundsContainPoint(bounds: LatLngBounds, point: LatLng): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  );
}

/**
 * 도형이 범위에 걸리는지 — 꼭짓점이 하나라도 범위 안이면 고른 것으로 본다.
 *
 * 도형 전체를 감싸야만 고른 것으로 치면 큰 구역은 화면을 꽉 채워 끌어야 해서 쓰기 어렵다.
 * 반대로 변과의 교차까지 보는 것은 계산만 늘고 실제 조작감 차이가 거의 없어 꼭짓점만 본다.
 */
export function boundsTouchPoints(bounds: LatLngBounds, points: LatLng[]): boolean {
  return points.some((point) => boundsContainPoint(bounds, point));
}

/** 끈 거리를 델타로. */
export function deltaBetween(from: LatLng, to: LatLng): LatLngDelta {
  return { dLat: to.lat - from.lat, dLng: to.lng - from.lng };
}

/** 델타만큼 옮긴 점. 축제장 규모에서는 위도 왜곡 보정 없이 더해도 오차가 무시할 만하다. */
export function shiftPoint(point: LatLng, delta: LatLngDelta): LatLng {
  return { lat: point.lat + delta.dLat, lng: point.lng + delta.dLng };
}

/** 델타만큼 옮긴 점들. 원본을 건드리지 않고 새 배열을 준다. */
export function shiftPoints(points: LatLng[], delta: LatLngDelta): LatLng[] {
  return points.map((point) => shiftPoint(point, delta));
}

/** 범위가 사실상 한 점인지 — 드래그가 아니라 그냥 클릭이었는지 가른다. */
export function isNegligibleBounds(bounds: LatLngBounds, tolerance = NEGLIGIBLE_DEGREES): boolean {
  return bounds.north - bounds.south < tolerance && bounds.east - bounds.west < tolerance;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * 화면 좌표에서 다각형 안에 있는지(ray casting).
 *
 * 소속 판정은 위경도로 하지만(`containsPoint`), 「지금 커서가 이 도형을 짚었나」는 보이는
 * 대로 판정해야 한다. 지도가 회전하거나 위도가 높아 세로로 눌린 곳에서도 눈에 보이는 모양과
 * 집히는 범위가 어긋나지 않는다.
 */
export function pointInPolygonPx(polygon: Point2D[], point: Point2D): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const straddles = a.y > point.y !== b.y > point.y;
    if (!straddles) continue;
    const crossX = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (point.x < crossX) inside = !inside;
  }
  return inside;
}

/** 선분과 점 사이 최단 거리(px). 선분 밖으로 벗어나면 가까운 끝점까지의 거리다. */
function distanceToSegmentPx(a: Point2D, b: Point2D, point: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * 꺾은선과 점 사이 최단 거리(px). 점이 없으면 무한대다.
 *
 * 통로 같은 선 도형은 두께가 몇 px뿐이라 정확히 그 위를 짚기 어렵다. 거리로 판정해
 * 선 근처를 눌러도 집히게 한다.
 */
export function distanceToPolylinePx(points: Point2D[], point: Point2D): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY;
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y);
  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < points.length - 1; i++) {
    nearest = Math.min(nearest, distanceToSegmentPx(points[i], points[i + 1], point));
  }
  return nearest;
}

/** 위도 1도가 덮는 거리(m). 경도와 위도를 같은 자로 재야 「가로로 늘어섰는지」를 제대로 가른다. */
const METERS_PER_DEGREE_LAT = 111320;

/**
 * 고른 점들을 한 줄로 고르게 다시 놓는다.
 *
 * 축제 부스는 길 양옆으로 줄지어 서는 일이 많은데, 하나씩 끌어 맞추면 들쭉날쭉해진다.
 * 양 끝 두 점은 그대로 두고 그 사이를 같은 간격으로 채운다 — 전체가 통째로 움직이면
 * 어디에 놓였는지 다시 찾아야 하므로, 끝점을 기준으로 삼아 눈에 익은 자리를 지킨다.
 *
 * 가로로 늘어선 무리는 가로로, 세로로 늘어선 무리는 세로로 세운다. 경도 1도는 위도
 * 1도보다 짧으므로(위도에 따라 cos배) 도 단위로 그냥 비교하면 세로 무리를 가로로 착각한다.
 */
export function lineUpPoints(points: LatLng[]): LatLng[] {
  if (points.length < 3) return points.map((point) => ({ ...point }));

  const meanLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lngScale = Math.max(Math.cos((meanLat * Math.PI) / 180), 0.01);
  const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
  const latSpread = spread(points.map((point) => point.lat)) * METERS_PER_DEGREE_LAT;
  const lngSpread = spread(points.map((point) => point.lng)) * METERS_PER_DEGREE_LAT * lngScale;
  const alongLng = lngSpread >= latSpread;

  const order = points
    .map((point, index) => ({ index, key: alongLng ? point.lng : point.lat }))
    .sort((a, b) => a.key - b.key);
  const first = points[order[0].index];
  const last = points[order[order.length - 1].index];

  const lined = points.map((point) => ({ ...point }));
  const steps = order.length - 1;
  order.forEach((entry, position) => {
    const ratio = position / steps;
    lined[entry.index] = {
      lat: first.lat + (last.lat - first.lat) * ratio,
      lng: first.lng + (last.lng - first.lng) * ratio,
    };
  });
  return lined;
}
