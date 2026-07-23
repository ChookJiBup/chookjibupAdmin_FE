"use client";

import { Fragment } from "react";
import { Layer, Rect, Stage, Text } from "react-konva";
import type { BoothMapObject } from "./types";

const OBJECT_COLOR: Record<BoothMapObject["type"], string> = {
  BOOTH: "#d4d4d8",
  PATH: "#f4f4f5",
  BUILDING: "#9f9fa9",
  OPEN_SPACE: "#fafafa",
  RESTROOM: "#e4e4e7",
  ENTRANCE: "#fb2c36",
};

/**
 * 이 파일은 항상 `next/dynamic(..., { ssr: false })`를 통해서만 불러온다.
 * Konva는 canvas(window)에 의존해 SSR에서 렌더링할 수 없다.
 */
export default function BoothMapCanvas({ objects }: { objects: BoothMapObject[] }) {
  return (
    <Stage width={360} height={220}>
      <Layer>
        {objects.map((object) => (
          <Fragment key={object.id}>
            <Rect
              x={object.x}
              y={object.y}
              width={object.width}
              height={object.height}
              fill={OBJECT_COLOR[object.type]}
              stroke="#71717b"
              strokeWidth={1}
              draggable
            />
            <Text x={object.x + 4} y={object.y + 4} text={object.label} fontSize={11} listening={false} />
          </Fragment>
        ))}
      </Layer>
    </Stage>
  );
}
