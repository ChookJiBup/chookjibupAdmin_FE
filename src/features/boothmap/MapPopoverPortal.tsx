"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-kakao-maps-sdk";
import type { LatLng } from "./latLng";

/** 지도 내부 레이어에 갇히지 않도록 편집 말풍선을 화면 위에 표시한다. */
export function MapPopoverPortal({
  position,
  children,
}: {
  position: LatLng;
  children: ReactNode;
}) {
  const map = useMap();
  const portalRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      const portal = portalRef.current;
      if (!portal) return;
      const point = map
        .getProjection()
        .containerPointFromCoords(new window.kakao.maps.LatLng(position.lat, position.lng));
      const bounds = map.getNode().getBoundingClientRect();
      const x = Math.max(144, Math.min(window.innerWidth - 144, bounds.left + point.x));
      const y = bounds.top + point.y - 8;
      // 지도가 이동하는 동안 React 렌더를 거치면 말풍선이 한 프레임씩 뒤따라온다.
      // 포털 요소의 transform을 직접 갱신해 핀과 같은 프레임에 움직인다.
      portal.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
      portal.style.visibility = "visible";
    };
    update();
    window.kakao.maps.event.addListener(map, "center_changed", update);
    window.kakao.maps.event.addListener(map, "zoom_changed", update);
    window.addEventListener("resize", update);
    return () => {
      window.kakao.maps.event.removeListener(map, "center_changed", update);
      window.kakao.maps.event.removeListener(map, "zoom_changed", update);
      window.removeEventListener("resize", update);
    };
  }, [map, position.lat, position.lng]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={portalRef}
      data-map-tools
      className="fixed top-0 left-0 z-[110] invisible will-change-transform"
    >
      {children}
    </div>,
    document.body,
  );
}
