"use client";

// 서드파티 CSS는 그것을 쓰는 컴포넌트 옆에서 import한다(Next.js 16 CSS 가이드의 External stylesheets).
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_MAX_NATIVE_ZOOM,
  MAP_TILE_MAX_ZOOM,
  MAP_TILE_SUBDOMAINS,
  MAP_TILE_URL,
} from "./mapConfig";
import { LeafletMapContext, type LeafletMapContextValue } from "./mapContext";
import type { MapLatLng } from "./mapGeometry";

/**
 * 이 파일은 import 시점에 leaflet을 불러와 `window`를 읽는다. 서버에서 평가되면 죽으므로
 * 직접 import하지 말고 `LeafletMap`(next/dynamic, ssr: false)을 통해서만 쓴다.
 */

export interface LeafletMapProps {
  /** 지도 중심. 값(lat/lng)이 바뀔 때만 애니메이션 없이 옮긴다. */
  center: MapLatLng;
  /** Leaflet 줌. 카카오 레벨에서 옮길 때는 `kakaoLevelToZoom`을 쓴다. 값이 바뀔 때만 적용한다. */
  zoom: number;
  /** 가장 멀리 축소할 수 있는 줌. */
  minZoom?: number;
  /** 가장 가까이 확대할 수 있는 줌. 없으면 타일 최대 줌(22)까지. */
  maxZoom?: number;
  /** 지도 바깥 상자에 붙는 클래스. 지도 크기는 이 상자를 꽉 채운다. */
  className?: string;
  /** 마우스 휠 확대. 기본 true(카카오 `scrollwheel` 기본값과 같다). */
  scrollWheelZoom?: boolean;
  /** 더블클릭 확대. 기본 true(카카오 `disableDoubleClickZoom`의 반대). */
  doubleClickZoom?: boolean;
  /** 지도 빈 곳을 눌렀을 때. `clickable` 오버레이 위를 누른 경우에는 오지 않는다. */
  onClick?: (point: MapLatLng) => void;
  /** 지도 인스턴스가 만들어지면 map, 없어지면 null로 불린다. 이동·좌표 변환에 쓴다. */
  onMapReady?: (map: L.Map | null) => void;
  /** `MapOverlay`, `MapPolyline`, `MapPolygon` 등 지도 안쪽 요소. */
  children?: ReactNode;
}

/** React 오버레이 pane. 기본 markerPane(600)과 같은 높이라 선·도형(400) 위에 뜬다. */
const OVERLAY_PANE = "chookjibup-overlay";
const OVERLAY_PANE_Z_INDEX = 600;
/** 팜플렛 pane. 타일(200)보다 위, 선·도형(400)보다 아래. 카카오에서 overlayLayer 맨 앞에 깔던 것과 같다. */
const PAMPHLET_PANE = "chookjibup-pamphlet";
const PAMPHLET_PANE_Z_INDEX = 350;

/*
  leaflet.css가 .leaflet-container에 Helvetica를 지정해, 지도 안 오버레이 글자가 앱 글꼴
  (Pretendard)에서 벗어났다. 인라인 스타일은 @layer 밖 CSS보다도 우선하므로 여기서 되돌린다.
  글자 크기는 출처 표시가 커지지 않게 컨테이너에 두고, 오버레이 pane에서만 페이지 기본값으로 되돌린다.
*/
const CONTAINER_STYLE: CSSProperties = { fontFamily: "inherit" };

function ensurePane(map: L.Map, name: string, zIndex: number): HTMLElement {
  const pane = map.getPane(name) ?? map.createPane(name);
  pane.style.zIndex = String(zIndex);
  return pane;
}

export function LeafletMapCanvas({
  center,
  zoom,
  minZoom,
  maxZoom,
  className,
  scrollWheelZoom = true,
  doubleClickZoom = true,
  onClick,
  onMapReady,
  children,
}: LeafletMapProps) {
  const [context, setContext] = useState<LeafletMapContextValue | null>(null);
  const initialOptionsRef = useRef({
    center,
    zoom,
    minZoom,
    maxZoom,
    scrollWheelZoom,
    doubleClickZoom,
  });
  const onClickRef = useRef(onClick);
  const onMapReadyRef = useRef(onMapReady);
  useEffect(() => {
    onClickRef.current = onClick;
    onMapReadyRef.current = onMapReady;
  }, [onClick, onMapReady]);

  /*
    지도는 ref 콜백에서 만들고 ref 콜백의 정리 함수에서 없앤다. StrictMode 개발 모드에서 붙였다
    뗐다 다시 붙여도 만들기·없애기가 짝을 이뤄, 이미 지워진 지도를 계속 쓰는 일이 없다.
  */
  const attachMap = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    let map: L.Map | null = null;
    let disposed = false;

    const handleClick = (event: L.LeafletMouseEvent) => {
      onClickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    };

    const createMap = (): L.Map => {
      const initial = initialOptionsRef.current;
      const created = L.map(node, {
        center: [initial.center.lat, initial.center.lng],
        zoom: initial.zoom,
        minZoom: initial.minZoom,
        maxZoom: initial.maxZoom ?? MAP_TILE_MAX_ZOOM,
        zoomControl: false,
        /*
          줌 애니메이션을 끈다. 켜 두면 확대·축소 중 250ms 동안 타일만 CSS로 늘어나고,
          React 오버레이·팜플렛은 애니메이션이 끝난 뒤에야 제자리로 튀어 네 귀퉁이에서 벗어나
          보인다. 끄면 두 손가락 확대 중에도 매 프레임 'zoom' 이벤트로 함께 다시 그려진다.
          카카오도 레벨 prop을 바꾸면 애니메이션 없이 바로 바뀌었다.
        */
        zoomAnimation: false,
        markerZoomAnimation: false,
        // 카카오 지도는 키보드 조작이 없었고, 편집기 단축키와 겹치지 않게 끈다.
        keyboard: false,
        scrollWheelZoom: initial.scrollWheelZoom,
        doubleClickZoom: initial.doubleClickZoom,
      });
      L.tileLayer(MAP_TILE_URL, {
        attribution: MAP_TILE_ATTRIBUTION,
        subdomains: MAP_TILE_SUBDOMAINS,
        maxNativeZoom: MAP_TILE_MAX_NATIVE_ZOOM,
        maxZoom: MAP_TILE_MAX_ZOOM,
      }).addTo(created);

      const overlayPane = ensurePane(created, OVERLAY_PANE, OVERLAY_PANE_Z_INDEX);
      overlayPane.style.fontSize = "1rem";
      overlayPane.style.lineHeight = "1.5";
      const pamphletPane = ensurePane(created, PAMPHLET_PANE, PAMPHLET_PANE_Z_INDEX);

      created.on("click", handleClick);
      setContext({ map: created, L, overlayPane, pamphletPane });
      onMapReadyRef.current?.(created);
      return created;
    };

    /*
      상자 크기가 0일 때 지도를 만들면 Leaflet이 크기 0을 기준으로 중심을 잡아, 크기가 생긴 뒤
      중심·줌이 어긋난 채 남는다(축제 상세처럼 부모 높이가 늦게 정해지는 화면). 그래서 상자에
      실제 크기가 생긴 첫 순간에 지도를 만들고, 이후 크기 변화는 다시 재기만 한다(카카오 relayout).
    */
    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      if (map) {
        map.invalidateSize();
        return;
      }
      if (node.clientWidth > 0 && node.clientHeight > 0) map = createMap();
    });
    resizeObserver.observe(node);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (!map) return;
      map.off("click", handleClick);
      onMapReadyRef.current?.(null);
      map.remove();
      map = null;
      setContext(null);
    };
  }, []);

  const map = context?.map ?? null;
  const { lat, lng } = center;

  useEffect(() => {
    if (!map) return;
    if (minZoom !== undefined) map.setMinZoom(minZoom);
  }, [map, minZoom]);

  useEffect(() => {
    if (!map) return;
    map.setMaxZoom(maxZoom ?? MAP_TILE_MAX_ZOOM);
  }, [map, maxZoom]);

  useEffect(() => {
    if (!map) return;
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [map, lat, lng]);

  useEffect(() => {
    if (!map) return;
    map.setZoom(zoom, { animate: false });
  }, [map, zoom]);

  useEffect(() => {
    if (!map) return;
    if (scrollWheelZoom) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
  }, [map, scrollWheelZoom]);

  useEffect(() => {
    if (!map) return;
    if (doubleClickZoom) map.doubleClickZoom.enable();
    else map.doubleClickZoom.disable();
  }, [map, doubleClickZoom]);

  return (
    <div className={className}>
      {/* Leaflet이 이 상자의 class와 자식을 직접 고치므로 React가 다시 건드리지 않게 비워 둔다. */}
      <div ref={attachMap} className="h-full w-full" style={CONTAINER_STYLE} />
      {context ? <LeafletMapContext value={context}>{children}</LeafletMapContext> : null}
    </div>
  );
}
