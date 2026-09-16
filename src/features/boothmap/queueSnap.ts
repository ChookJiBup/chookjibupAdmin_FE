import type { LatLng } from "./latLng";
const radians = Math.PI / 180;
export const queueSegmentLength = (a: LatLng, b: LatLng) =>
  Math.hypot(
    (b.lat - a.lat) * radians * 6371000,
    (b.lng - a.lng) * radians * 6371000 * Math.cos(a.lat * radians),
  );
export function snapToQueuePath(path: LatLng[], point: LatLng): LatLng {
  let nearest = Infinity;
  let result = path[0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      scale = Math.cos(point.lat * radians);
    const dx = (b.lng - a.lng) * scale,
      dy = b.lat - a.lat;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.lng - a.lng) * scale * dx + (point.lat - a.lat) * dy) / (dx * dx + dy * dy),
      ),
    );
    const projected = { lat: a.lat + dy * t, lng: a.lng + (b.lng - a.lng) * t };
    const distance = queueSegmentLength(point, projected);
    if (distance < nearest) {
      nearest = distance;
      result = projected;
    }
  }
  return result;
}
