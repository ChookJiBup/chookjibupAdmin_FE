/**
 * festivalId → mapId(배치도 UUID) 로컬 캐시.
 *
 * 백엔드에 "축제로 배치도 조회"(예: GET /api/festivals/{festivalId}/maps) API가 없다 —
 * 배치도는 오직 `POST /api/festivals`(multipart, 축제 생성 시 이미지 첨부)의 응답에만
 * mapId가 담겨 나온다. 그래서 이 브라우저가 축제를 생성한 세션이 아니면 mapId를 알아낼
 * 방법이 없다. 백엔드에 "축제 단건 조회 시 mapId 포함" 또는 "배치도 목록 조회" API가
 * 추가되면 이 캐시는 지우고 서버 조회로 교체해야 한다.
 */
function storageKey(festivalId: string) {
  return `chookjibup-admin-boothmap-mapid-${festivalId}`;
}

export function getCachedMapId(festivalId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(festivalId));
}

export function setCachedMapId(festivalId: string, mapId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(festivalId), mapId);
}

export function clearCachedMapId(festivalId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(festivalId));
}
