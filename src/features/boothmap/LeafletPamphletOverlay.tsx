"use client";

import { useEffect, useId, useRef } from "react";
import { useLeafletMap } from "@/lib/map/mapContext";
import type { LatLng } from "./latLng";
import type { OverlayCorners } from "./overlayProjection";

export interface LeafletPamphletOverlayProps {
  imageUrl: string | null;
  corners: OverlayCorners | null;
  boundary: LatLng[] | null;
  clipToBoundary: boolean;
  opacity: number;
  visible: boolean;
  /** 보기 모드에서는 포인터를 가로채지 않는다. */
  interactive?: boolean;
  onImageError?: () => void;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function affineMatrix(
  width: number,
  height: number,
  topLeft: { x: number; y: number },
  topRight: { x: number; y: number },
  bottomLeft: { x: number; y: number },
): string {
  const a = (topRight.x - topLeft.x) / width;
  const b = (topRight.y - topLeft.y) / width;
  const c = (bottomLeft.x - topLeft.x) / height;
  const d = (bottomLeft.y - topLeft.y) / height;
  return `matrix(${a} ${b} ${c} ${d} ${topLeft.x} ${topLeft.y})`;
}

/**
 * 팜플렛 이미지를 네 귀퉁이에 맞춰 까는 Leaflet 레이어. 카카오 `PamphletOverlay`와 같은 방식이다.
 *
 * SW/NE 사각형(`L.imageOverlay`)을 쓰지 않아 회전이 유지된다. 이미지 두 장을 각각 삼각형으로
 * 잘라 아핀변환해 네 귀퉁이를 모두 맞춘다. 좌표는 Leaflet 레이어 좌표(px)라, 끌기·이동 때는
 * pane과 함께 움직이고 줌·보기 재설정·크기 변경 때만 다시 계산한다. `LeafletMap` 안에 둔다.
 */
export function LeafletPamphletOverlay({
  imageUrl,
  corners,
  boundary,
  clipToBoundary,
  opacity,
  visible,
  interactive = false,
  onImageError,
}: LeafletPamphletOverlayProps) {
  const context = useLeafletMap();
  // SVG url(#id)에 쓸 수 없는 문자(React 19의 « » 등)를 걷어낸다.
  const clipId = `pamphlet-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const onImageErrorRef = useRef(onImageError);
  useEffect(() => {
    onImageErrorRef.current = onImageError;
  }, [onImageError]);

  useEffect(() => {
    if (!context || !imageUrl || !corners || !visible) return;
    const { map, pamphletPane } = context;
    const overlayCorners = corners;
    let disposed = false;

    const root = document.createElement("div");
    root.style.position = "absolute";
    root.style.left = "0";
    root.style.top = "0";
    root.style.pointerEvents = interactive ? "auto" : "none";
    root.style.opacity = String(Math.min(1, Math.max(0, opacity)));

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("overflow", "visible");
    // 기본 300×150 상자가 레이어 원점에서 포인터를 받지 않게 1px로 두고, 그림은 overflow로 보인다.
    svg.setAttribute("width", "1");
    svg.setAttribute("height", "1");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.overflow = "visible";

    const defs = document.createElementNS(SVG_NS, "defs");
    const clipPath = document.createElementNS(SVG_NS, "clipPath");
    clipPath.setAttribute("id", clipId);
    const clipPolygon = document.createElementNS(SVG_NS, "polygon");
    clipPath.appendChild(clipPolygon);
    defs.appendChild(clipPath);

    const group = document.createElementNS(SVG_NS, "g");
    const image = document.createElementNS(SVG_NS, "image");
    image.setAttribute("preserveAspectRatio", "none");
    image.setAttribute("width", "1");
    image.setAttribute("height", "1");
    image.setAttribute("href", imageUrl);
    const handleError = () => {
      if (!disposed) onImageErrorRef.current?.();
    };
    image.addEventListener("error", handleError);
    const secondImage = image.cloneNode(true) as SVGImageElement;
    const triangleClips = ["first", "second"].map((suffix) => {
      const clip = document.createElementNS(SVG_NS, "clipPath");
      clip.id = `${clipId}-${suffix}`;
      clip.setAttribute("clipPathUnits", "userSpaceOnUse");
      const polygon = document.createElementNS(SVG_NS, "polygon");
      clip.appendChild(polygon);
      defs.appendChild(clip);
      return { clip, polygon };
    });
    // 클립은 이미지 변환의 바깥 그룹에 적용해 지도 투영 좌표를 그대로 쓴다.
    [image, secondImage].forEach((element, index) => {
      const triangle = document.createElementNS(SVG_NS, "g");
      triangle.setAttribute("clip-path", `url(#${triangleClips[index].clip.id})`);
      triangle.appendChild(element);
      group.appendChild(triangle);
    });
    svg.appendChild(defs);
    svg.appendChild(group);
    root.appendChild(svg);

    const toPoint = (point: LatLng) => map.latLngToLayerPoint([point.lat, point.lng]);

    const draw = () => {
      if (disposed) return;
      const topLeft = toPoint(overlayCorners.topLeft);
      const topRight = toPoint(overlayCorners.topRight);
      const bottomLeft = toPoint(overlayCorners.bottomLeft);
      const bottomRight = toPoint(overlayCorners.bottomRight);
      image.setAttribute("transform", affineMatrix(1, 1, topLeft, topRight, bottomLeft));
      secondImage.setAttribute(
        "transform",
        affineMatrix(
          1,
          1,
          {
            x: topRight.x + bottomLeft.x - bottomRight.x,
            y: topRight.y + bottomLeft.y - bottomRight.y,
          },
          topRight,
          bottomLeft,
        ),
      );
      [
        [topLeft, topRight, bottomLeft],
        [topRight, bottomRight, bottomLeft],
      ].forEach((points, index) => {
        triangleClips[index].polygon.setAttribute(
          "points",
          points.map((point) => `${point.x},${point.y}`).join(" "),
        );
      });
      if (clipToBoundary && boundary && boundary.length >= 3) {
        const clipPoints = boundary.map((point) => {
          const projected = toPoint(point);
          return `${projected.x},${projected.y}`;
        });
        clipPolygon.setAttribute("points", clipPoints.join(" "));
        group.setAttribute("clip-path", `url(#${clipId})`);
      } else {
        group.removeAttribute("clip-path");
      }
    };

    pamphletPane.appendChild(root);
    draw();
    /*
      레이어 좌표는 끌기·panTo 동안 변하지 않아(pane이 통째로 움직인다) 줌·보기 재설정 때만
      다시 그리면 된다. 상자 크기 변경은 LeafletMapCanvas가 invalidateSize로 처리하고,
      여기서는 'resize'에도 한 번 더 그려 둔다.
    */
    map.on("zoom viewreset resize", draw);
    return () => {
      disposed = true;
      map.off("zoom viewreset resize", draw);
      image.removeEventListener("error", handleError);
      root.remove();
    };
  }, [context, imageUrl, corners, boundary, clipToBoundary, opacity, visible, interactive, clipId]);

  return null;
}
