/**
 * 바탕 지도 타일 설정과 카카오 레벨 ↔ Leaflet 줌 변환.
 *
 * leaflet을 import하지 않으므로 서버에서 평가돼도 안전하다.
 */

/**
 * 상호명(POI) 라벨이 없는 CARTO Voyager 타일. 부스를 그릴 때 가게 이름이 겹쳐 보이지 않게 한다.
 *
 * CARTO는 운영 환경에서 자체 API 키를 요구하므로, 키가 붙은 주소나 다른 타일 서버로
 * 통째로 바꿀 수 있게 `NEXT_PUBLIC_MAP_TILE_URL`로 덮어쓴다.
 */
export const DEFAULT_MAP_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";

/** 타일 약관상 지도 위에 항상 보여야 하는 출처 표시. */
export const DEFAULT_MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// NEXT_PUBLIC_ 값은 빌드 때 문자열로 박히므로 반드시 process.env.XXX 형태 그대로 읽는다.
// 빈 문자열(.env.example을 그대로 복사한 경우)도 기본값으로 되돌린다.
export const MAP_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_MAP_TILE_URL;
export const MAP_TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || DEFAULT_MAP_TILE_ATTRIBUTION;

export const MAP_TILE_SUBDOMAINS = "abcd";
/** 타일 서버가 실제로 이미지를 주는 마지막 줌. 그보다 크게 확대하면 이 줌의 타일을 늘려 쓴다. */
export const MAP_TILE_MAX_NATIVE_ZOOM = 20;
export const MAP_TILE_MAX_ZOOM = 22;

/**
 * 카카오 레벨 L과 Leaflet 줌 z는 위도 37° 부근에서 `z = 20 - L`일 때 화면 해상도(m/px)가
 * 거의 같다. 기존 화면의 확대 단계·한계를 이 규칙으로 옮겨 체감 확대 수준을 유지한다.
 */
const KAKAO_LEVEL_ZOOM_SUM = 20;

/** 카카오 레벨(작을수록 확대)을 Leaflet 줌(클수록 확대)으로 바꾼다. */
export function kakaoLevelToZoom(level: number): number {
  return KAKAO_LEVEL_ZOOM_SUM - level;
}

/** Leaflet 줌을 카카오 레벨로 바꾼다. */
export function zoomToKakaoLevel(zoom: number): number {
  return KAKAO_LEVEL_ZOOM_SUM - zoom;
}
