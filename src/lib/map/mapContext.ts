"use client";

import { createContext, use } from "react";
import type * as Leaflet from "leaflet";

/**
 * 지도 안쪽 컴포넌트(오버레이·선·팜플렛)가 지도 인스턴스를 받아 가는 컨텍스트.
 *
 * leaflet은 import하는 순간 `window`를 읽어 서버 렌더링에서 죽는다. 그래서 leaflet 런타임은
 * 브라우저에서만 불러오는 `LeafletMapCanvas`가 쥐고, 여기로 `L` 네임스페이스까지 함께 넘긴다.
 * 이 파일과 이것을 쓰는 컴포넌트들은 leaflet을 타입으로만 참조하므로 어디서 import해도 안전하다.
 */
export interface LeafletMapContextValue {
  map: Leaflet.Map;
  L: typeof Leaflet;
  /** React 오버레이(`MapOverlay`)를 올리는 pane. 선·도형보다 위에 뜬다. */
  overlayPane: HTMLElement;
  /** 팜플렛 이미지를 까는 pane. 바탕 타일 위, 선·도형 아래에 깔린다. */
  pamphletPane: HTMLElement;
}

export const LeafletMapContext = createContext<LeafletMapContextValue | null>(null);

/** 지도 안에서 렌더링될 때만 값이 있다. 지도 밖이거나 지도가 아직 없으면 null. */
export function useLeafletMap(): LeafletMapContextValue | null {
  return use(LeafletMapContext);
}
