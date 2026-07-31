"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FacilityPalette } from "./FacilityPalette";
import { PropertyPanel } from "./PropertyPanel";
import { useBoothMapStore } from "./store";
import type { BoothMapObject, BoothMapShapeType } from "./types";

// Konva는 canvas(window)에 의존해 SSR에서 렌더링할 수 없다.
const BoothMapCanvas = dynamic(() => import("./BoothMapCanvas"), { ssr: false });

export function boothMapDraftStorageKey(festivalId: string) {
  return `chookjibup-boothmap-draft-${festivalId}`;
}

/**
 * 부스맵 편집기 — 팔레트 + 캔버스 + 속성 패널 + 툴바.
 * 부스 좌표를 저장하는 백엔드 API가 없어(docs/specs/03_부스맵_에디터_구현계획.md),
 * "저장"은 이 브라우저의 localStorage에만 남는다.
 */
export function BoothMapEditor({
  festivalId,
  initialObjects,
}: {
  festivalId: string;
  initialObjects: BoothMapObject[];
}) {
  const objects = useBoothMapStore((state) => state.objects);
  const tool = useBoothMapStore((state) => state.tool);
  const zoom = useBoothMapStore((state) => state.zoom);
  const past = useBoothMapStore((state) => state.past);
  const future = useBoothMapStore((state) => state.future);
  const loadObjects = useBoothMapStore((state) => state.loadObjects);
  const setTool = useBoothMapStore((state) => state.setTool);
  const setZoom = useBoothMapStore((state) => state.setZoom);
  const undo = useBoothMapStore((state) => state.undo);
  const redo = useBoothMapStore((state) => state.redo);
  const cancelDraftLine = useBoothMapStore((state) => state.cancelDraftLine);

  const [pendingFacilityType, setPendingFacilityType] = useState<BoothMapShapeType | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(boothMapDraftStorageKey(festivalId));
    loadObjects(saved ? (JSON.parse(saved) as BoothMapObject[]) : initialObjects);
    // festivalId가 바뀔 때만 최초 1회 불러온다 — 이후 편집 중 initialObjects가
    // 다시 넘어와도 사용자가 하던 작업을 덮어쓰지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festivalId]);

  function handleSave() {
    window.localStorage.setItem(boothMapDraftStorageKey(festivalId), JSON.stringify(objects));
    setSavedAt(new Date().toLocaleTimeString("ko-KR"));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-300 p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={past.length === 0}
        >
          Undo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={future.length === 0}
        >
          Redo
        </Button>

        <div className="mx-1 h-5 w-px bg-zinc-200" />

        <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => z - 0.1)}>
          -
        </Button>
        <span className="body-small w-12 text-center text-zinc-950">{Math.round(zoom * 100)}%</span>
        <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => z + 0.1)}>
          +
        </Button>

        <div className="mx-1 h-5 w-px bg-zinc-200" />

        <Button
          type="button"
          variant={tool === "queue-line" ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            if (tool === "queue-line") {
              cancelDraftLine();
            } else {
              setPendingFacilityType(null);
              setTool("queue-line");
            }
          }}
        >
          대기열 그리기
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span title="배치 최적화 API가 아직 백엔드에 없어 동작하지 않습니다.">
            <Button type="button" variant="outline" size="sm" disabled>
              최적 배치 제안
            </Button>
          </span>
          <Button type="button" size="sm" onClick={handleSave}>
            저장
          </Button>
        </div>
      </div>

      {savedAt ? (
        <p className="body-caption text-zinc-500">
          {savedAt}에 이 브라우저에 저장됨 (서버에는 저장되지 않습니다)
        </p>
      ) : null}

      <div className="flex items-start gap-3">
        <FacilityPalette
          pendingType={pendingFacilityType}
          onSelectPending={(type) => {
            if (type) setTool("select");
            setPendingFacilityType(type);
          }}
        />
        <BoothMapCanvas
          pendingFacilityType={pendingFacilityType}
          onPendingFacilityPlaced={() => setPendingFacilityType(null)}
        />
        <PropertyPanel />
      </div>
    </div>
  );
}
