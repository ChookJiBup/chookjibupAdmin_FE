"use client";

import { useEffect, useRef } from "react";
import type { PathOptions, Polygon as LeafletPolygon, Polyline as LeafletPolyline } from "leaflet";
import { useLeafletMap } from "./mapContext";
import type { MapLatLng } from "./mapGeometry";

/** 카카오 `strokeStyle` 이름. 실제로 쓰는 것과 가까운 몇 가지만 옮겼다. */
export type MapStrokeStyle = "solid" | "shortdash" | "shortdot" | "dash" | "dot" | "longdash";

/**
 * 선 두께 배수로 적은 [선, 빈칸] 길이. 카카오 스타일 이름이 VML dashstyle과 같아 그 패턴을 따랐다.
 * 카카오 실제 렌더링과 픽셀 단위로 같다고 확인하지는 않았다.
 */
const DASH_PATTERNS: Record<Exclude<MapStrokeStyle, "solid">, [number, number]> = {
  shortdash: [3, 1],
  shortdot: [1, 1],
  dash: [4, 3],
  dot: [1, 3],
  longdash: [8, 3],
};

// 카카오 Polyline/Polygon 기본값(kakao.maps.d.ts 문서 기준). 빠진 prop이 같은 모양으로 보이게 한다.
const DEFAULT_STROKE_COLOR = "#F10000";
const DEFAULT_STROKE_WEIGHT = 3;
const DEFAULT_STROKE_OPACITY = 0.6;
const DEFAULT_FILL_COLOR = "#F10000";
const DEFAULT_FILL_OPACITY = 0;

interface VectorStyleProps {
  path: MapLatLng[];
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  strokeStyle?: MapStrokeStyle;
  /** 있으면 선·도형이 클릭을 받는다. 이때 지도 onClick은 불리지 않는다. */
  onClick?: () => void;
}

export type MapPolylineProps = VectorStyleProps;

export interface MapPolygonProps extends VectorStyleProps {
  fillColor?: string;
  fillOpacity?: number;
}

interface VectorPathProps extends MapPolygonProps {
  kind: "polyline" | "polygon";
}

function toTuples(path: MapLatLng[]): [number, number][] {
  return path.map((point) => [point.lat, point.lng]);
}

function buildPathOptions({
  kind,
  strokeColor = DEFAULT_STROKE_COLOR,
  strokeWeight = DEFAULT_STROKE_WEIGHT,
  strokeOpacity = DEFAULT_STROKE_OPACITY,
  strokeStyle = "solid",
  fillColor = DEFAULT_FILL_COLOR,
  fillOpacity = DEFAULT_FILL_OPACITY,
}: Omit<VectorPathProps, "path" | "onClick">): PathOptions {
  const dash = strokeStyle === "solid" ? null : DASH_PATTERNS[strokeStyle];
  return {
    color: strokeColor,
    weight: strokeWeight,
    opacity: strokeOpacity,
    // 둥근 끝은 짧은 빈칸을 메워 버리므로 점선일 때만 평평한 끝을 쓴다.
    lineCap: dash ? "butt" : "round",
    dashArray: dash ? dash.map((length) => length * strokeWeight).join(" ") : undefined,
    fill: kind === "polygon",
    fillColor,
    fillOpacity,
  };
}

function VectorPath({
  kind,
  path,
  strokeColor,
  strokeWeight,
  strokeOpacity,
  strokeStyle,
  fillColor,
  fillOpacity,
  onClick,
}: VectorPathProps) {
  const context = useLeafletMap();
  const layerRef = useRef<LeafletPolyline | LeafletPolygon | null>(null);
  const interactive = Boolean(onClick);
  const latestRef = useRef({ path, onClick });
  useEffect(() => {
    latestRef.current = { path, onClick };
  }, [path, onClick]);

  // 클릭 가능 여부는 Leaflet이 만들 때만 반영하므로, 바뀌면 레이어를 새로 만든다.
  useEffect(() => {
    if (!context) return;
    const { map, L } = context;
    const latLngs = toTuples(latestRef.current.path);
    const options = { interactive };
    const layer = kind === "polygon" ? L.polygon(latLngs, options) : L.polyline(latLngs, options);
    const handleClick = () => latestRef.current.onClick?.();
    if (interactive) layer.on("click", handleClick);
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      layer.off("click", handleClick);
      layer.remove();
      layerRef.current = null;
    };
  }, [context, kind, interactive]);

  useEffect(() => {
    layerRef.current?.setLatLngs(toTuples(path));
  }, [context, kind, interactive, path]);

  useEffect(() => {
    layerRef.current?.setStyle(
      buildPathOptions({
        kind,
        strokeColor,
        strokeWeight,
        strokeOpacity,
        strokeStyle,
        fillColor,
        fillOpacity,
      }),
    );
  }, [
    context,
    kind,
    interactive,
    strokeColor,
    strokeWeight,
    strokeOpacity,
    strokeStyle,
    fillColor,
    fillOpacity,
  ]);

  return null;
}

/** 꺾은선. 카카오 `Polyline`과 같은 prop 이름을 쓴다. `LeafletMap` 안에서만 그려진다. */
export function MapPolyline(props: MapPolylineProps) {
  return <VectorPath kind="polyline" {...props} />;
}

/** 다각형. 카카오 `Polygon`과 같은 prop 이름을 쓴다. `LeafletMap` 안에서만 그려진다. */
export function MapPolygon(props: MapPolygonProps) {
  return <VectorPath kind="polygon" {...props} />;
}
