"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLeafletMap } from "./mapContext";
import type { MapLatLng } from "./mapGeometry";

export interface MapOverlayProps {
  /** 오버레이를 붙일 위경도. */
  position: MapLatLng;
  /** 내용 너비 대비 가로 기준점(0 왼쪽 ~ 1 오른쪽). 기본 0.5(카카오 CustomOverlay와 같다). */
  xAnchor?: number;
  /** 내용 높이 대비 세로 기준점(0 위 ~ 1 아래). 기본 0.5. */
  yAnchor?: number;
  /** 같은 지도 안 오버레이끼리의 쌓임 순서. 선·도형보다는 항상 위다. */
  zIndex?: number;
  /**
   * true면 오버레이를 누른 것이 지도로 전달되지 않는다. 지도 끌기가 시작되지 않고
   * 지도 onClick도 불리지 않는다. 안쪽 React onClick·onPointerDown은 그대로 동작한다.
   * (주의: 네이티브 mousedown/touchstart 전파를 막으므로 안쪽 onMouseDown/onTouchStart는 오지 않는다.)
   * false(기본)면 오버레이 위에서 눌러도 지도 끌기·지도 클릭이 함께 일어난다.
   */
  clickable?: boolean;
  children?: ReactNode;
}

type ClickDisableTarget = HTMLElement & { _leaflet_disable_click?: boolean };

interface OverlayElements {
  /** 위경도 자리에 놓이는 0×0 기준점. Leaflet이 translate3d로 옮긴다. */
  root: HTMLDivElement;
  /** 기준점에서 xAnchor/yAnchor만큼 비켜 놓이는 내용 상자. React children이 포털로 들어간다. */
  content: ClickDisableTarget;
}

/** Leaflet `DomEvent.disableClickPropagation`이 막는 이벤트 목록. 해제할 때 똑같이 넘긴다. */
const CLICK_BLOCK_EVENTS = "mousedown touchstart dblclick contextmenu";

function createOverlayElements(): OverlayElements {
  const root = document.createElement("div");
  root.style.position = "absolute";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "0";
  root.style.height = "0";
  const content = document.createElement("div");
  content.style.position = "absolute";
  content.style.left = "0";
  content.style.top = "0";
  // 0×0 기준점 안에서 내용이 최소 폭으로 접혀 줄바꿈되지 않게 한다.
  content.style.width = "max-content";
  root.appendChild(content);
  return { root, content };
}

function applyOverlayLayout(
  elements: OverlayElements,
  xAnchor: number,
  yAnchor: number,
  zIndex: number | undefined,
) {
  // 퍼센트 translate는 내용 자신의 크기 기준이라, 내용 크기가 바뀌어도 기준점이 유지된다.
  elements.content.style.transform = `translate(${-xAnchor * 100}%, ${-yAnchor * 100}%)`;
  elements.root.style.zIndex = zIndex === undefined ? "" : String(zIndex);
}

/**
 * 위경도 자리에 React 요소를 띄운다. 카카오 `CustomOverlayMap` 대체.
 *
 * 오버레이는 지도 pane 안에 있어 끌기·이동 애니메이션 때는 pane과 함께 움직이고,
 * 줌이 바뀌거나 보기가 재설정될 때만 위치를 다시 계산한다. `LeafletMap` 안에서만 그려진다.
 */
export function MapOverlay({
  position,
  xAnchor = 0.5,
  yAnchor = 0.5,
  zIndex,
  clickable = false,
  children,
}: MapOverlayProps) {
  const context = useLeafletMap();
  // 지도 안에서만 렌더링되므로(브라우저 전용) document가 있다. 그래도 서버에서 불리면 건너뛴다.
  const [elements] = useState(() =>
    typeof document === "undefined" ? null : createOverlayElements(),
  );

  useLayoutEffect(() => {
    if (!context || !elements) return;
    context.overlayPane.appendChild(elements.root);
    return () => {
      elements.root.remove();
    };
  }, [context, elements]);

  const { lat, lng } = position;
  useLayoutEffect(() => {
    if (!context || !elements) return;
    const { map, L } = context;
    const place = () => {
      L.DomUtil.setPosition(elements.root, map.latLngToLayerPoint([lat, lng]).round());
    };
    place();
    // 끌기·panTo는 pane 자체가 움직여 다시 잴 필요가 없다. 레이어 좌표 원점이 바뀌는 경우만 듣는다.
    map.on("zoom viewreset", place);
    return () => {
      map.off("zoom viewreset", place);
    };
  }, [context, elements, lat, lng]);

  useLayoutEffect(() => {
    if (!elements) return;
    applyOverlayLayout(elements, xAnchor, yAnchor, zIndex);
  }, [elements, xAnchor, yAnchor, zIndex]);

  useLayoutEffect(() => {
    if (!context || !elements || !clickable) return;
    const { L } = context;
    L.DomEvent.disableClickPropagation(elements.content);
    return () => {
      L.DomEvent.off(elements.content, CLICK_BLOCK_EVENTS, L.DomEvent.stopPropagation);
      elements.content._leaflet_disable_click = false;
    };
  }, [context, elements, clickable]);

  if (!context || !elements) return null;
  return createPortal(children, elements.content);
}
