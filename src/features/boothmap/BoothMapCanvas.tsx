"use client";

import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Fragment } from "react";
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { FACILITY_COLOR } from "./FacilityPalette";
import { snapToGrid, useBoothMapStore } from "./store";
import type { BoothMapShapeType } from "./types";

export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 420;
const GRID_LINES_X = Array.from({ length: CANVAS_WIDTH / 20 }, (_, index) => index * 20);
const GRID_LINES_Y = Array.from({ length: CANVAS_HEIGHT / 20 }, (_, index) => index * 20);

/** blob/http(s) URL을 Konva Image에 쓸 수 있는 HTMLImageElement로 읽어들인다. */
function useHtmlImage(src: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;
    const element = new window.Image();
    element.onload = () => setImage(element);
    element.src = src;
    return () => {
      element.onload = null;
    };
  }, [src]);

  return src ? image : null;
}

/**
 * 이 파일은 항상 `next/dynamic(..., { ssr: false })`를 통해서만 불러온다.
 * Konva는 canvas(window)에 의존해 SSR에서 렌더링할 수 없다.
 */
export default function BoothMapCanvas({
  previewUrl,
  pendingFacilityType,
  onPendingFacilityPlaced,
}: {
  previewUrl?: string;
  pendingFacilityType: BoothMapShapeType | null;
  onPendingFacilityPlaced: () => void;
}) {
  const objects = useBoothMapStore((state) => state.objects);
  const selectedId = useBoothMapStore((state) => state.selectedId);
  const tool = useBoothMapStore((state) => state.tool);
  const zoom = useBoothMapStore((state) => state.zoom);
  const draftLinePoints = useBoothMapStore((state) => state.draftLinePoints);
  const select = useBoothMapStore((state) => state.select);
  const updateShape = useBoothMapStore((state) => state.updateShape);
  const removeSelected = useBoothMapStore((state) => state.removeSelected);
  const addShape = useBoothMapStore((state) => state.addShape);
  const setZoom = useBoothMapStore((state) => state.setZoom);
  const addDraftLinePoint = useBoothMapStore((state) => state.addDraftLinePoint);
  const finishDraftLine = useBoothMapStore((state) => state.finishDraftLine);

  const backgroundImage = useHtmlImage(previewUrl);
  const containerRef = useRef<HTMLDivElement>(null);
  const shapeRefs = useRef(new Map<string, Konva.Rect>());
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedId ? shapeRefs.current.get(selectedId) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, objects]);

  // Delete/Backspace로 선택된 객체 삭제. 다른 입력창에 포커스가 있을 때는 무시한다.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (!selectedId) return;
      event.preventDefault();
      removeSelected();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, removeSelected]);

  function handleStageMouseDown(event: Konva.KonvaEventObject<MouseEvent>) {
    const stage = event.target.getStage();
    const position = stage?.getRelativePointerPosition();
    if (!position) return;

    if (tool === "queue-line") {
      addDraftLinePoint(position.x, position.y);
      return;
    }

    if (pendingFacilityType) {
      addShape(pendingFacilityType, position.x, position.y);
      onPendingFacilityPlaced();
      return;
    }

    // 빈 캔버스를 클릭하면 선택 해제.
    if (event.target === stage) {
      select(null);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("text/booth-map-facility") as BoothMapShapeType | "";
    if (!type || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    addShape(type, x, y);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onWheel={(event) => {
          event.preventDefault();
          setZoom((current) => current + (event.deltaY > 0 ? -0.1 : 0.1));
        }}
        className="w-fit overflow-hidden rounded-lg border border-zinc-300 bg-white"
      >
        <Stage
          width={CANVAS_WIDTH * zoom}
          height={CANVAS_HEIGHT * zoom}
          scaleX={zoom}
          scaleY={zoom}
          onMouseDown={handleStageMouseDown}
          onDblClick={() => {
            if (tool === "queue-line") finishDraftLine();
          }}
        >
          <Layer listening={false}>
            {backgroundImage ? (
              <KonvaImage image={backgroundImage} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
            ) : (
              <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#fafafa" />
            )}
            {GRID_LINES_X.map((x) => (
              <Line
                key={`grid-x-${x}`}
                points={[x, 0, x, CANVAS_HEIGHT]}
                stroke="#f4f4f5"
                strokeWidth={1}
              />
            ))}
            {GRID_LINES_Y.map((y) => (
              <Line
                key={`grid-y-${y}`}
                points={[0, y, CANVAS_WIDTH, y]}
                stroke="#f4f4f5"
                strokeWidth={1}
              />
            ))}
          </Layer>

          <Layer>
            {objects.map((object) => {
              if (object.kind === "line") {
                return (
                  <Fragment key={object.id}>
                    <Line
                      points={object.points}
                      stroke={object.id === selectedId ? "#236cf6" : "#71717b"}
                      strokeWidth={object.id === selectedId ? 3 : 2}
                      onClick={(event) => {
                        if (tool !== "select") return;
                        event.cancelBubble = true;
                        select(object.id);
                      }}
                    />
                  </Fragment>
                );
              }

              return (
                <Fragment key={object.id}>
                  <Rect
                    ref={(node) => {
                      if (node) shapeRefs.current.set(object.id, node);
                      else shapeRefs.current.delete(object.id);
                    }}
                    x={object.x}
                    y={object.y}
                    width={object.width}
                    height={object.height}
                    fill={FACILITY_COLOR[object.type]}
                    stroke={object.id === selectedId ? "#236cf6" : "#71717b"}
                    strokeWidth={object.id === selectedId ? 2 : 1}
                    draggable={tool === "select"}
                    onClick={(event) => {
                      if (tool !== "select") return;
                      event.cancelBubble = true;
                      select(object.id);
                    }}
                    onDragEnd={(event) => {
                      updateShape(object.id, {
                        x: snapToGrid(event.target.x()),
                        y: snapToGrid(event.target.y()),
                      });
                    }}
                    onTransformEnd={(event) => {
                      const node = event.target as Konva.Rect;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();
                      node.scaleX(1);
                      node.scaleY(1);
                      updateShape(object.id, {
                        x: snapToGrid(node.x()),
                        y: snapToGrid(node.y()),
                        width: Math.max(20, snapToGrid(node.width() * scaleX)),
                        height: Math.max(20, snapToGrid(node.height() * scaleY)),
                      });
                    }}
                  />
                  <Text
                    x={object.x + 4}
                    y={object.y + 4}
                    text={object.label}
                    fontSize={11}
                    listening={false}
                  />
                </Fragment>
              );
            })}

            {draftLinePoints.length >= 2 ? (
              <Line points={draftLinePoints} stroke="#236cf6" strokeWidth={2} dash={[6, 4]} />
            ) : null}

            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
              }
            />
          </Layer>
        </Stage>
      </div>
      {tool === "queue-line" ? (
        <p className="body-caption text-zinc-500">
          클릭해서 점을 찍고, 더블클릭하면 대기열 선이 완성됩니다.
        </p>
      ) : null}
    </div>
  );
}
