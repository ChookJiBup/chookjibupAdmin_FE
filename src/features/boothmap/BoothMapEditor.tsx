"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { deleteFestivalMap, getMapEditor, replaceFestivalMap, saveMapEditor } from "./api";
import { BoothMapEditorReady, type LocalZone } from "./BoothMapEditorReady";
import { boothMapObjectsToNodeChanges, nodeToBoothMapObject } from "./geometry";
import { useBoothMapStore } from "./store";

const MAX_DISPLAY_WIDTH = 900;

/**
 * 부스맵 편집기 — 데이터 로드(`GET .../editor`)/저장(`PUT .../editor`, editRevision
 * 기반 낙관적 락)/이미지 교체/배치도 삭제를 맡고, 화면은 `BoothMapEditorReady`에 맡긴다.
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

  const editorQuery = useQuery({
    queryKey: ["boothmap-editor", festivalId, mapId],
    queryFn: () => getMapEditor(festivalId, mapId),
  });

  const objects = useBoothMapStore((state) => state.objects);
  const deletedNodeIds = useBoothMapStore((state) => state.deletedNodeIds);
  const loadObjects = useBoothMapStore((state) => state.loadObjects);
  const setZoom = useBoothMapStore((state) => state.setZoom);

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zones, setZones] = useState<LocalZone[]>([]);

  // 에디터를 새로 불러올 때만(mapId 변경, 최초 로드, 저장 후 재조회) 캔버스 상태를 채운다.
  // 편집 도중 objects가 바뀌어도 이 effect가 다시 돌아 덮어쓰지 않도록 dataUpdatedAt만 의존한다.
  useEffect(() => {
    if (!editorQuery.data) return;
    const { imageWidth: rawWidth, imageHeight: rawHeight, nodes } = editorQuery.data;
    const imageWidth = rawWidth ?? 0;
    const imageHeight = rawHeight ?? 0;
    if (imageWidth <= 0 || imageHeight <= 0) {
      return;
    }
    const loaded = nodes
      .map((node) => nodeToBoothMapObject(node, imageWidth, imageHeight))
      .filter((object) => object !== null);
    loadObjects(loaded);
    const loadedObjectIds = new Set(loaded.map((object) => object.id));
    // 서버 재조회 시 구역 편집 상태도 같은 revision으로 맞춘다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZones(
      (editorQuery.data.zones ?? []).map((zone) => ({
        id: zone.zoneId,
        name: zone.name,
        boothIds: zone.boothNodeIds
          .map((nodeId) => `node-${nodeId}`)
          .filter((objectId) => loadedObjectIds.has(objectId)),
      })),
    );
    setZoom(Math.min(1, MAX_DISPLAY_WIDTH / imageWidth) || 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorQuery.dataUpdatedAt]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editorQuery.data) throw new Error("불러온 도면 정보가 없습니다.");
      const nodes = boothMapObjectsToNodeChanges(
        objects,
        deletedNodeIds,
        editorQuery.data.imageWidth ?? 0,
        editorQuery.data.imageHeight ?? 0,
      );
      return saveMapEditor(festivalId, mapId, {
        baseRevision: editorQuery.data.editRevision,
        nodes,
        zones: zones.map((zone, sortOrder) => ({
          zoneId: zone.id,
          name: zone.name,
          sortOrder,
          boothNodeIds: zone.boothIds
            .map((objectId) => objects.find((object) => object.id === objectId))
            .flatMap((object) =>
              object?.kind === "shape" && object.type === "BOOTH"
                ? [object.nodeId ?? object.id]
                : [],
            ),
        })),
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

  const { imageWidth: rawWidth, imageHeight: rawHeight, displayImageUrl } = editorQuery.data;
  const imageWidth = rawWidth ?? 0;
  const imageHeight = rawHeight ?? 0;

  if (!displayImageUrl || imageWidth <= 0 || imageHeight <= 0) {
    return (
      <p className="body-regular text-zinc-500">
        이 지도는 이미지 배치도가 아닙니다. 카카오맵 부스맵 편집 화면을 이용하세요.
      </p>
    );
  }

  return (
    <>
      <BoothMapEditorReady
        festivalId={festivalId}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
        displayImageUrl={displayImageUrl}
        zones={zones}
        onZonesChange={setZones}
        onSave={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        saveError={saveMutation.isError ? getApiErrorMessage(saveMutation.error) : null}
        savedAt={savedAt}
        conflict={conflict}
        onRefreshAfterConflict={() => {
          setConflict(false);
          editorQuery.refetch();
        }}
        onReplaceFile={(file) => replaceMutation.mutate(file)}
        replacing={replaceMutation.isPending}
        replaceError={replaceMutation.isError ? getApiErrorMessage(replaceMutation.error) : null}
        onRequestDelete={() => setDeleteDialogOpen(true)}
      />
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
    </>
  );
}
