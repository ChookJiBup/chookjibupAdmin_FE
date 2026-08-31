"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Cross2Icon,
  DimensionsIcon,
  FileIcon,
  HamburgerMenuIcon,
  RadiobuttonIcon,
  ResetIcon,
  RulerHorizontalIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MapSidePanel } from "@/components/map/MapSidePanel";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { BoothMapGuideBanner } from "./BoothMapGuideBanner";
import { MapInfoPopover } from "./MapInfoPopover";
import { useBoothMapStore } from "./store";
import type { BoothMapShape } from "./types";
import { ZoneListItem } from "./ZoneListItem";

export interface LocalZone {
  id: string;
  name: string;
  boothIds: string[];
}

type Selection = { kind: "zone"; id: string } | { kind: "booth"; id: string };

function createLocalId() {
  return crypto.randomUUID();
}

/**
 * Figma "add - mapping result - start / make group / select zone" 화면들을
 * 구현한 부스맵 에디터의 "배치도 있음" 상태.
 */
export function BoothMapEditorReady({
  festivalId,
  imageWidth,
  imageHeight,
  displayImageUrl,
  zones,
  onZonesChange,
  onSave,
  saving,
  saveError,
  savedAt,
  conflict,
  onRefreshAfterConflict,
  onReplaceFile,
  replacing,
  replaceError,
  onRequestDelete,
}: {
  festivalId: string;
  imageWidth: number;
  imageHeight: number;
  displayImageUrl: string;
  zones: LocalZone[];
  onZonesChange: React.Dispatch<React.SetStateAction<LocalZone[]>>;
  onSave: () => void;
  saving: boolean;
  saveError: string | null;
  savedAt: string | null;
  conflict: boolean;
  onRefreshAfterConflict: () => void;
  onReplaceFile: (file: File) => void;
  replacing: boolean;
  replaceError: string | null;
  onRequestDelete: () => void;
}) {
  const router = useRouter();
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);

  const objects = useBoothMapStore((state) => state.objects);
  const selectedId = useBoothMapStore((state) => state.selectedId);
  const tool = useBoothMapStore((state) => state.tool);
  const zoom = useBoothMapStore((state) => state.zoom);
  const past = useBoothMapStore((state) => state.past);
  const future = useBoothMapStore((state) => state.future);
  const draftLinePoints = useBoothMapStore((state) => state.draftLinePoints);
  const select = useBoothMapStore((state) => state.select);
  const setTool = useBoothMapStore((state) => state.setTool);
  const setZoom = useBoothMapStore((state) => state.setZoom);
  const addShape = useBoothMapStore((state) => state.addShape);
  const updateShape = useBoothMapStore((state) => state.updateShape);
  const removeSelected = useBoothMapStore((state) => state.removeSelected);
  const undo = useBoothMapStore((state) => state.undo);
  const redo = useBoothMapStore((state) => state.redo);
  const addDraftLinePoint = useBoothMapStore((state) => state.addDraftLinePoint);
  const finishDraftLine = useBoothMapStore((state) => state.finishDraftLine);

  const [pendingBooth, setPendingBooth] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [expandedZoneIds, setExpandedZoneIds] = useState<Set<string>>(new Set());
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    setHideNav(true);
    setFullBleed(true);
    return () => {
      setHideNav(false);
      setFullBleed(false);
    };
  }, [setHideNav, setFullBleed]);

  const boothShapes = useMemo(
    () => objects.filter((object): object is BoothMapShape => object.kind === "shape"),
    [objects],
  );
  const zoneIdByBoothId = useMemo(() => {
    const map = new Map<string, string>();
    zones.forEach((zone) => zone.boothIds.forEach((id) => map.set(id, zone.id)));
    return map;
  }, [zones]);
  const ungroupedBooths = boothShapes.filter((booth) => !zoneIdByBoothId.has(booth.id));

  function centerOf(booth: BoothMapShape) {
    return { x: (booth.x + booth.width / 2) * zoom, y: (booth.y + booth.height / 2) * zoom };
  }

  function zoneAnchor(zone: LocalZone) {
    const members = boothShapes.filter((booth) => zone.boothIds.includes(booth.id));
    if (members.length === 0) return { x: 0, y: 0 };
    const points = members.map(centerOf);
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    };
  }

  function toggleChecked(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleZoneExpanded(id: string) {
    setExpandedZoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMapPointerDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    if (tool === "queue-line") {
      addDraftLinePoint(x, y);
      return;
    }
    if (pendingBooth) {
      addShape("BOOTH", x, y);
      setPendingBooth(false);
      return;
    }
    select(null);
    setSelection(null);
  }

  const selectedZone = selection?.kind === "zone" ? zones.find((z) => z.id === selection.id) : null;
  const selectedBooth =
    selection?.kind === "booth" ? boothShapes.find((b) => b.id === selection.id) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-300">
      <div
        className="absolute inset-0 overflow-auto"
        onWheel={(event) => {
          event.preventDefault();
          setZoom((current) => current + (event.deltaY > 0 ? -0.1 : 0.1));
        }}
      >
        <div
          ref={mapBoxRef}
          className="relative bg-white bg-cover bg-center"
          style={{
            width: imageWidth * zoom,
            height: imageHeight * zoom,
            backgroundImage: `url(${displayImageUrl})`,
          }}
          onClick={handleMapPointerDown}
          onDoubleClick={() => {
            if (tool === "queue-line") finishDraftLine();
          }}
        >
          <svg
            width={imageWidth * zoom}
            height={imageHeight * zoom}
            viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            className="pointer-events-none absolute inset-0"
          >
            {zones.map((zone) => {
              const members = boothShapes.filter((booth) => zone.boothIds.includes(booth.id));
              if (members.length === 0) return null;
              const xs = members.map((b) => b.x + b.width / 2);
              const ys = members.map((b) => b.y + b.height / 2);
              const pad = 24;
              const minX = Math.min(...xs) - pad;
              const maxX = Math.max(...xs) + pad;
              const minY = Math.min(...ys) - pad;
              const maxY = Math.max(...ys) + pad;
              return (
                <rect
                  key={zone.id}
                  x={minX}
                  y={minY}
                  width={maxX - minX}
                  height={maxY - minY}
                  rx={12}
                  fill="#236cf61a"
                  stroke="#236cf6"
                  strokeWidth={2}
                />
              );
            })}
            {objects.map((object) =>
              object.kind === "line" ? (
                <polyline
                  key={object.id}
                  points={object.points.reduce<string>(
                    (acc, value, index) =>
                      index % 2 === 0 ? `${acc}${value},` : `${acc}${value} `,
                    "",
                  )}
                  fill="none"
                  stroke={object.id === selectedId ? "#236cf6" : "#71717b"}
                  strokeWidth={2}
                />
              ) : null,
            )}
            {draftLinePoints.length >= 2 ? (
              <polyline
                points={draftLinePoints.reduce<string>(
                  (acc, value, index) => (index % 2 === 0 ? `${acc}${value},` : `${acc}${value} `),
                  "",
                )}
                fill="none"
                stroke="#236cf6"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            ) : null}
          </svg>

          {boothShapes.map((booth) => {
            const { x, y } = centerOf(booth);
            return (
              <button
                key={booth.id}
                type="button"
                title={booth.label}
                aria-label={booth.label}
                onClick={(event) => {
                  event.stopPropagation();
                  select(booth.id);
                  setSelection({ kind: "booth", id: booth.id });
                }}
                className={`absolute flex size-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${
                  booth.id === selectedId ? "bg-point-600/25" : "bg-point-600 shadow-sm"
                }`}
                style={{ left: x, top: y }}
              >
                {booth.id === selectedId ? (
                  <span className="size-1 rounded-full bg-point-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute top-10 bottom-10 left-8 flex items-start gap-5">
        <MapSidePanel>
          <p className="body-large-bold text-zinc-950">
            축제부스 <span className="text-primary">{boothShapes.length}</span>
          </p>

          <div className="flex flex-col gap-1">
            {zones.map((zone) => {
              const members = boothShapes.filter((booth) => zone.boothIds.includes(booth.id));
              const expanded = expandedZoneIds.has(zone.id);
              return (
                <ZoneListItem
                  key={zone.id}
                  name={zone.name}
                  count={members.length}
                  expanded={expanded}
                  checked={selection?.kind === "zone" && selection.id === zone.id}
                  onToggleExpanded={() => toggleZoneExpanded(zone.id)}
                  onCheckedChange={(checked) =>
                    setSelection(checked ? { kind: "zone", id: zone.id } : null)
                  }
                  onSelect={() => setSelection({ kind: "zone", id: zone.id })}
                >
                  {members.map((booth) => (
                    <BoothRow
                      key={booth.id}
                      booth={booth}
                      checked={checkedIds.has(booth.id)}
                      onToggleChecked={() => toggleChecked(booth.id)}
                      onSelect={() => setSelection({ kind: "booth", id: booth.id })}
                      indent
                    />
                  ))}
                </ZoneListItem>
              );
            })}

            {ungroupedBooths.map((booth) => (
              <BoothRow
                key={booth.id}
                booth={booth}
                checked={checkedIds.has(booth.id)}
                onToggleChecked={() => toggleChecked(booth.id)}
                onSelect={() => setSelection({ kind: "booth", id: booth.id })}
              />
            ))}

            {boothShapes.length === 0 ? (
              <p className="body-caption text-zinc-500">등록된 부스가 없습니다.</p>
            ) : null}
          </div>

          {checkedIds.size >= 2 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mt-auto w-full"
              onClick={() => setGroupPopoverOpen(true)}
            >
              선택 항목 그룹화
            </Button>
          ) : null}
        </MapSidePanel>

        <BoothMapGuideBanner />
      </div>

      <div className="absolute top-10 right-8 flex flex-col items-end gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span title={past.length === 0 ? "되돌릴 편집 내용이 없습니다." : undefined}>
              <IconButton
                icon={<ResetIcon />}
                aria-label="실행취소"
                disabled={past.length === 0}
                onClick={undo}
                className={past.length === 0 ? "text-zinc-500" : "text-zinc-950"}
              />
            </span>
            <span title={future.length === 0 ? "다시 실행할 편집 내용이 없습니다." : undefined}>
              <IconButton
                icon={<ResetIcon className="-scale-x-100" />}
                aria-label="다시실행"
                disabled={future.length === 0}
                onClick={redo}
                className={future.length === 0 ? "text-zinc-500" : "text-zinc-950"}
              />
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onRequestDelete}
              className="text-error"
            >
              배치도 삭제
            </Button>
            <input
              ref={replaceFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onReplaceFile(file);
                if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              icon={<FileIcon />}
              disabled={replacing}
              onClick={() => replaceFileInputRef.current?.click()}
            >
              {replacing ? "재업로드 중..." : "파일 재업로드"}
            </Button>
            <Button type="button" variant="primary" disabled={saving} onClick={onSave}>
              {saving ? "저장 중..." : "저장하기"}
            </Button>
          </div>
          <IconButton
            icon={<Cross2Icon />}
            aria-label="닫기"
            onClick={() => router.push(`/console/festivals/${festivalId}`)}
          />
        </div>

        {conflict ? (
          <div className="flex w-80 items-center justify-between gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2">
            <p className="body-caption text-orange-700">
              다른 관리자가 먼저 저장했습니다. 새로고침하면 최신 내용을 다시 불러옵니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRefreshAfterConflict}>
              새로고침
            </Button>
          </div>
        ) : null}
        {saveError && !conflict ? (
          <p className="body-caption text-error rounded-lg bg-white px-3 py-2 shadow">
            {saveError}
          </p>
        ) : null}
        {replaceError ? (
          <p className="body-caption text-error rounded-lg bg-white px-3 py-2 shadow">
            {replaceError}
          </p>
        ) : null}
        {savedAt ? (
          <p className="body-caption rounded-lg bg-white px-3 py-2 text-zinc-500 shadow">
            {savedAt}에 저장됨
          </p>
        ) : null}
      </div>

      <div className="absolute right-8 bottom-10 flex flex-col items-center gap-5">
        <div className="flex flex-col gap-1">
          <IconButton
            icon={<RadiobuttonIcon className="size-5" />}
            aria-label="핀 추가"
            onClick={() => {
              setPendingBooth((prev) => !prev);
              setTool("select");
            }}
            className={pendingBooth ? "bg-primary/10 text-zinc-950" : "text-zinc-950"}
          />
          <span title="자유 폴리곤 그리기는 아직 지원하지 않아요 — 부스를 선택해 그룹화하면 구역이 자동으로 만들어져요.">
            <IconButton
              icon={<DimensionsIcon className="size-5" />}
              aria-label="폴리곤 추가"
              disabled
              className="text-zinc-950"
            />
          </span>
          <IconButton
            icon={<RulerHorizontalIcon className="size-5" />}
            aria-label="라인 추가"
            onClick={() => {
              setPendingBooth(false);
              setTool(tool === "queue-line" ? "select" : "queue-line");
            }}
            className={tool === "queue-line" ? "bg-primary/10 text-zinc-950" : "text-zinc-950"}
          />
        </div>
        <MapZoomControls
          onZoomIn={() => setZoom((z) => z + 0.1)}
          onZoomOut={() => setZoom((z) => z - 0.1)}
        />
      </div>

      {groupPopoverOpen
        ? (() => {
            const members = boothShapes.filter((booth) => checkedIds.has(booth.id));
            const xs = members.map((b) => centerOf(b).x);
            const ys = members.map((b) => centerOf(b).y);
            const anchor = {
              x: xs.reduce((a, b) => a + b, 0) / (xs.length || 1),
              y: ys.reduce((a, b) => a + b, 0) / (ys.length || 1),
            };
            return (
              <MapInfoPopover
                mode="group-create"
                initialName="새 구역"
                style={{ left: 288 + 24 + anchor.x, top: anchor.y }}
                onConfirm={(name) => {
                  const zone: LocalZone = {
                    id: createLocalId(),
                    name,
                    boothIds: Array.from(checkedIds),
                  };
                  onZonesChange((prev) => [...prev, zone]);
                  setExpandedZoneIds((prev) => new Set(prev).add(zone.id));
                  setCheckedIds(new Set());
                  setGroupPopoverOpen(false);
                }}
                onCancel={() => setGroupPopoverOpen(false)}
              />
            );
          })()
        : null}

      {selectedZone
        ? (() => {
            const anchor = zoneAnchor(selectedZone);
            return (
              <MapInfoPopover
                mode="zone-edit"
                initialName={selectedZone.name}
                style={{ left: 288 + 24 + anchor.x, top: anchor.y }}
                onConfirm={(name) => {
                  onZonesChange((prev) =>
                    prev.map((zone) => (zone.id === selectedZone.id ? { ...zone, name } : zone)),
                  );
                  setSelection(null);
                }}
                onCancel={() => setSelection(null)}
                onDelete={() => {
                  onZonesChange((prev) => prev.filter((zone) => zone.id !== selectedZone.id));
                  setSelection(null);
                }}
              />
            );
          })()
        : null}

      {selectedBooth
        ? (() => {
            const anchor = centerOf(selectedBooth);
            return (
              <MapInfoPopover
                mode="booth-edit"
                initialName={selectedBooth.label}
                style={{ left: 288 + 24 + anchor.x, top: anchor.y }}
                onConfirm={(name) => {
                  updateShape(selectedBooth.id, { label: name });
                  setSelection(null);
                }}
                onCancel={() => setSelection(null)}
                onDelete={() => {
                  select(selectedBooth.id);
                  removeSelected();
                  setSelection(null);
                }}
              />
            );
          })()
        : null}
    </div>
  );
}

function BoothRow({
  booth,
  checked,
  onToggleChecked,
  onSelect,
  indent = false,
}: {
  booth: BoothMapShape;
  checked: boolean;
  onToggleChecked: () => void;
  onSelect: () => void;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 py-2 pl-1 ${indent ? "pl-7" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggleChecked}
        className="size-4 shrink-0 rounded-sm border-zinc-200"
      />
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-1">
        <span className="size-4 shrink-0 text-zinc-500">
          <RadiobuttonIcon />
        </span>
        <span className="body-regular truncate text-left text-zinc-950">{booth.label}</span>
      </button>
      <IconButton
        variant="ghost"
        size="sm"
        icon={<HamburgerMenuIcon />}
        aria-label="부스 메뉴"
        onClick={onSelect}
      />
    </div>
  );
}
