"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [screen, setScreen] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const point = map
        .getProjection()
        .containerPointFromCoords(new window.kakao.maps.LatLng(position.lat, position.lng));
      const bounds = map.getNode().getBoundingClientRect();
      setScreen({
        x: Math.max(144, Math.min(window.innerWidth - 144, bounds.left + point.x)),
        y: bounds.top + point.y - 8,
      });
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

  if (!screen) return null;
  return createPortal(
    <div
      data-map-tools
      className="fixed z-[110] -translate-x-1/2 -translate-y-full"
      style={{ left: screen.x, top: screen.y }}
    >
      {children}
    </div>,
    document.body,
  );
}
