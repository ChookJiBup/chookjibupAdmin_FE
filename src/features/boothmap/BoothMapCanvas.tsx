"use client";

import type Konva from "konva";
import { Fragment, useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import { FACILITY_COLOR } from "./FacilityPalette";
import { snapToGrid, useBoothMapStore } from "./store";
import type { BoothMapShapeType } from "./types";

/** 배경 이미지가 없을 때(신규 노드 없이 빈 캔버스로 시작한 경우)의 기본 작업 영역 크기. */
const FALLBACK_WIDTH = 640;
const FALLBACK_HEIGHT = 420;
const GRID_STEP = 20;
/** 격자 배경은 실사 배치도 이미지와 겹치면 잡음만 늘어나서, 배경 이미지가 없을 때만 그린다. */
const MAX_GRID_LINES = 80;

function useHtmlImage(url: string | null) {
  const [loaded, setLoaded] = useState<{ url: string; image: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const element = new window.Image();
    element.crossOrigin = "anonymous";
    element.onload = () => {
      if (!cancelled) setLoaded({ url, image: element });
    };
    element.src = url;
    return () => {
      cancelled = true;
      element.onload = null;
    };
  }, [url]);

  // url이 바뀌는 순간에는 아직 새 이미지가 로드되지 않았을 수 있어, 직전 url로 로드된
  // 이미지를 그대로 반환하지 않고 null로 취급한다(렌더 중 파생값이라 별도 상태/effect가 필요 없다).
  return loaded?.url === url ? loaded.image : null;
}

/**
 * 이 파일은 항상 `next/dynamic(..., { ssr: false })`를 통해서만 불러온다.
 * Konva는 canvas(window)에 의존해 SSR에서 렌더링할 수 없다.
 *
 * `backgroundImageUrl`이 있으면(실제 배치도를 불러온 경우) 그 이미지를 배경으로 깔고
 * 그 위에 노드를 겹쳐 그린다 — 관리자가 실제 도면과 대조하며 편집할 수 있어야 하기
 * 때문이다. 없으면(로컬에서 새로 만든 도형뿐인 경우) 빈 격자 배경을 쓴다.
 */
export default function BoothMapCanvas({
  worldWidth,
  worldHeight,
  backgroundImageUrl,
  pendingFacilityType,
  onPendingFacilityPlaced,
}: {
  worldWidth?: number;
  worldHeight?: number;
  backgroundImageUrl?: string | null;
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

  const width = worldWidth ?? FALLBACK_WIDTH;
  const height = worldHeight ?? FALLBACK_HEIGHT;
  const backgroundImage = useHtmlImage(backgroundImageUrl ?? null);

  const gridStepX = Math.max(GRID_STEP, Math.ceil(width / MAX_GRID_LINES / GRID_STEP) * GRID_STEP);
  const gridStepY = Math.max(GRID_STEP, Math.ceil(height / MAX_GRID_LINES / GRID_STEP) * GRID_STEP);
  const gridLinesX = Array.from({ length: Math.floor(width / gridStepX) }, (_, index) => index * gridStepX);
  const gridLinesY = Array.from({ length: Math.floor(height / gridStepY) }, (_, index) => index * gridStepY);

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
        className="w-fit max-w-full overflow-auto rounded-lg border border-zinc-300 bg-white"
      >
        <Stage
          width={width * zoom}
          height={height * zoom}
          scaleX={zoom}
          scaleY={zoom}
          onMouseDown={handleStageMouseDown}
          onDblClick={() => {
            if (tool === "queue-line") finishDraftLine();
          }}
        >
          <Layer listening={false}>
            {backgroundImage ? (
              <KonvaImage image={backgroundImage} width={width} height={height} />
            ) : (
              <>
                <Rect width={width} height={height} fill="#fafafa" />
                {gridLinesX.map((x) => (
                  <Line key={`grid-x-${x}`} points={[x, 0, x, height]} stroke="#f4f4f5" strokeWidth={1} />
                ))}
                {gridLinesY.map((y) => (
                  <Line key={`grid-y-${y}`} points={[0, y, width, y]} stroke="#f4f4f5" strokeWidth={1} />
                ))}
              </>
            )}
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

              const needsReview = object.reviewStatus === "REVIEW_REQUIRED";
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
                    opacity={backgroundImage ? 0.75 : 1}
                    stroke={object.id === selectedId ? "#236cf6" : needsReview ? "#f97316" : "#71717b"}
                    strokeWidth={object.id === selectedId ? 2 : 1}
                    dash={needsReview && object.id !== selectedId ? [4, 3] : undefined}
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
