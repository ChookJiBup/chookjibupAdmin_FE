"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { deleteFestivalMap, getMapEditor, replaceFestivalMap, saveMapEditor } from "./api";
import { FacilityPalette } from "./FacilityPalette";
import { boothMapObjectsToNodeChanges, nodeToBoothMapObject } from "./geometry";
import { PropertyPanel } from "./PropertyPanel";
import { useBoothMapStore } from "./store";
import type { BoothMapShapeType } from "./types";

// Konva는 canvas(window)에 의존해 SSR에서 렌더링할 수 없다.
const BoothMapCanvas = dynamic(() => import("./BoothMapCanvas"), { ssr: false });

const MAX_DISPLAY_WIDTH = 900;

const ROADMAP_STATUS_LABEL: Record<string, string> = {
  ANALYZING: "AI 분석 중",
  REVIEW_REQUIRED: "검수 필요",
  EDITING: "편집 중",
  PUBLISHED: "게시됨",
};

/**
 * 부스맵 편집기 — 팔레트 + 캔버스 + 속성 패널 + 툴바.
 * 노드는 `GET .../editor`로 불러오고, 저장은 `PUT .../editor`로 서버에 반영한다
 * (editRevision 기반 낙관적 락 — 다른 관리자가 먼저 저장하면 409가 온다).
 */
export function BoothMapEditor({
  festivalId,
  mapId,
  onMapDeleted,
  onImageReplaced,
}: {
  festivalId: string;
  mapId: string;
  /** 배치도를 삭제한 뒤 호출된다 — 상위 화면이 업로드 화면으로 되돌아가야 한다. */
  onMapDeleted: () => void;
  /** 이미지를 교체한 뒤 호출된다 — 상위 화면이 새 분석 작업의 진행 상태를 다시 보여줘야 한다. */
  onImageReplaced: () => void;
}) {
  const queryClient = useQueryClient();
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const editorQuery = useQuery({
    queryKey: ["boothmap-editor", festivalId, mapId],
    queryFn: () => getMapEditor(festivalId, mapId),
  });

  const objects = useBoothMapStore((state) => state.objects);
  const tool = useBoothMapStore((state) => state.tool);
  const zoom = useBoothMapStore((state) => state.zoom);
  const past = useBoothMapStore((state) => state.past);
  const future = useBoothMapStore((state) => state.future);
  const deletedNodeIds = useBoothMapStore((state) => state.deletedNodeIds);
  const loadObjects = useBoothMapStore((state) => state.loadObjects);
  const setTool = useBoothMapStore((state) => state.setTool);
  const setZoom = useBoothMapStore((state) => state.setZoom);
  const undo = useBoothMapStore((state) => state.undo);
  const redo = useBoothMapStore((state) => state.redo);
  const cancelDraftLine = useBoothMapStore((state) => state.cancelDraftLine);

  const [pendingFacilityType, setPendingFacilityType] = useState<BoothMapShapeType | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 에디터를 새로 불러올 때만(mapId 변경, 최초 로드, 저장 후 재조회) 캔버스 상태를 채운다.
  // 편집 도중 objects가 바뀌어도 이 effect가 다시 돌아 덮어쓰지 않도록 dataUpdatedAt만 의존한다.
  useEffect(() => {
    if (!editorQuery.data) return;
    const { imageWidth, imageHeight, nodes } = editorQuery.data;
    const loaded = nodes
      .map((node) => nodeToBoothMapObject(node, imageWidth, imageHeight))
      .filter((object) => object !== null);
    loadObjects(loaded);
    setZoom(Math.min(1, MAX_DISPLAY_WIDTH / imageWidth) || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorQuery.dataUpdatedAt]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editorQuery.data) throw new Error("불러온 도면 정보가 없습니다.");
      const nodes = boothMapObjectsToNodeChanges(
        objects,
        deletedNodeIds,
        editorQuery.data.imageWidth,
        editorQuery.data.imageHeight,
      );
      return saveMapEditor(festivalId, mapId, {
        baseRevision: editorQuery.data.editRevision,
        nodes,
      });
    },
    onSuccess: () => {
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      setConflict(false);
      queryClient.invalidateQueries({ queryKey: ["boothmap-editor", festivalId, mapId] });
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        setConflict(true);
      }
    },
  });

  const replaceMutation = useMutation({
    mutationFn: (file: File) => replaceFestivalMap(festivalId, mapId, file),
    onSuccess: onImageReplaced,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFestivalMap(festivalId, mapId),
    onSuccess: onMapDeleted,
  });

  if (editorQuery.isLoading) {
    return <p className="body-regular text-zinc-500">도면을 불러오는 중...</p>;
  }

  if (editorQuery.isError || !editorQuery.data) {
    return (
      <p className="body-regular text-error">
        {getApiErrorMessage(editorQuery.error, "도면을 불러오지 못했습니다.")}
      </p>
    );
  }

  const { imageWidth, imageHeight, displayImageUrl, roadmapStatus, analysis } = editorQuery.data;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-300 p-2">
        <span className="body-small-bold rounded bg-zinc-100 px-2 py-1 text-zinc-950">
          {ROADMAP_STATUS_LABEL[roadmapStatus] ?? roadmapStatus}
        </span>
        <span className="body-caption text-zinc-500">
          AI 인식 {analysis.detectedCount}개 · 검수 필요{" "}
          {objects.filter((object) => object.reviewStatus === "REVIEW_REQUIRED").length}개
        </span>

        <div className="mx-1 h-5 w-px bg-zinc-200" />

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
          <input
            ref={replaceFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) replaceMutation.mutate(file);
              if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => replaceFileInputRef.current?.click()}
            disabled={replaceMutation.isPending}
          >
            {replaceMutation.isPending ? "교체 중..." : "이미지 교체"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            배치도 삭제
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>

      {conflict ? (
        <div className="flex items-center justify-between rounded-lg border border-orange-300 bg-orange-50 px-3 py-2">
          <p className="body-caption text-orange-700">
            다른 관리자가 먼저 이 도면을 저장했습니다. 새로고침하면 최신 내용을 다시 불러옵니다
            (지금 화면의 편집 내용은 사라집니다).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setConflict(false);
              editorQuery.refetch();
            }}
          >
            새로고침
          </Button>
        </div>
      ) : null}
      {saveMutation.isError && !conflict ? (
        <p className="body-caption text-error">{getApiErrorMessage(saveMutation.error)}</p>
      ) : null}
      {replaceMutation.isError ? (
        <p className="body-caption text-error">{getApiErrorMessage(replaceMutation.error)}</p>
      ) : null}
      {savedAt ? <p className="body-caption text-zinc-500">{savedAt}에 저장됨</p> : null}

      <div className="flex items-start gap-3">
        <FacilityPalette
          pendingType={pendingFacilityType}
          onSelectPending={(type) => {
            if (type) setTool("select");
            setPendingFacilityType(type);
          }}
        />
        <BoothMapCanvas
          worldWidth={imageWidth}
          worldHeight={imageHeight}
          backgroundImageUrl={displayImageUrl}
          pendingFacilityType={pendingFacilityType}
          onPendingFacilityPlaced={() => setPendingFacilityType(null)}
        />
        <PropertyPanel />
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="배치도를 삭제하시겠습니까?"
        description="업로드한 원본 이미지와 편집한 노드가 모두 삭제됩니다. 되돌릴 수 없습니다."
        cancelLabel="취소"
        confirmLabel="삭제"
        confirmVariant="destructive"
        confirmPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
