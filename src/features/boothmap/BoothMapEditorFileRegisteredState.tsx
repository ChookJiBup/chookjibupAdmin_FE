"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CustomOverlayMap, Map as KakaoMap, Polygon, useKakaoLoader } from "react-kakao-maps-sdk";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cross2Icon,
  DimensionsIcon,
  HamburgerMenuIcon,
  RadiobuttonIcon,
  ResetIcon,
  RulerHorizontalIcon,
} from "@radix-ui/react-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { MapSidePanel } from "@/components/map/MapSidePanel";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { getManagedFestival } from "@/features/festivals/api";
import { FESTIVAL_MAP_CENTER } from "@/features/dashboard/mockData";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/httpError";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { cn } from "@/lib/utils";
import { ensureCoordinateMap, getMapEditor, saveMapEditor } from "./api";
import {
  boothMapPinsToNodeChanges,
  nodeToLocalBooth,
  type LocalBoothPin,
} from "./geometryWgs84";
import { MapInfoPopover } from "./MapInfoPopover";
import { primaryFestivalCenter } from "./mapCenter";

let cachedEmptyDragImage: HTMLImageElement | null = null;
/** 드래그 고스트를 숨기는 데 쓰는 1x1 투명 GIF — data URI라 동기적으로 디코딩된다. */
function getEmptyDragImage(): HTMLImageElement {
  if (!cachedEmptyDragImage) {
    const image = new Image();
    image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    cachedEmptyDragImage = image;
  }
  return cachedEmptyDragImage;
}

interface LocalZone {
  id: string;
  name: string;
  boothIds: string[];
}

function createZoneId() {
  return `zone-${Math.random().toString(36).slice(2, 9)}`;
}

/** 구역 멤버 부스들의 좌표를 감싸는 사각 폴리곤 좌표를 만든다(약간의 여백 포함). */
function zonePolygonPath(members: LocalBoothPin[]) {
  const pad = 0.0006;
  const lats = members.map((booth) => booth.lat);
  const lngs = members.map((booth) => booth.lng);
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  return [
    { lat: maxLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
    { lat: minLat, lng: maxLng },
    { lat: minLat, lng: minLng },
  ];
}

function centroidOf(members: LocalBoothPin[]) {
  return {
    lat: members.reduce((sum, booth) => sum + booth.lat, 0) / members.length,
    lng: members.reduce((sum, booth) => sum + booth.lng, 0) / members.length,
  };
}

/**
 * TODO(api/map-preview): 자동 매핑된 부스의 지도 좌표/이름/신뢰도와 구역 관계를
 * 조회하는 API가 없다. 이 데이터는 `?preview=ready` 개발 프리뷰에서만 사용한다.
 */
const MOCK_BOOTHS: LocalBoothPin[] = [
  {
    id: "b1",
    nodeId: null,
    name: "CU편의점",
    lat: FESTIVAL_MAP_CENTER.lat + 0.0032,
    lng: FESTIVAL_MAP_CENTER.lng - 0.0004,
  },
  {
    id: "b2",
    nodeId: null,
    name: "(주)대정 김밥공장",
    lat: FESTIVAL_MAP_CENTER.lat + 0.0016,
    lng: FESTIVAL_MAP_CENTER.lng - 0.0022,
    uncertain: true,
  },
  {
    id: "b3",
    nodeId: null,
    name: "김천특산품 홍보관",
    lat: FESTIVAL_MAP_CENTER.lat + 0.0018,
    lng: FESTIVAL_MAP_CENTER.lng + 0.0028,
  },
  {
    id: "b4",
    nodeId: null,
    name: "메인무대",
    lat: FESTIVAL_MAP_CENTER.lat,
    lng: FESTIVAL_MAP_CENTER.lng,
  },
  {
    id: "b5",
    nodeId: null,
    name: "명품로컬김밥판매존",
    lat: FESTIVAL_MAP_CENTER.lat - 0.0016,
    lng: FESTIVAL_MAP_CENTER.lng - 0.0012,
    uncertain: true,
  },
  {
    id: "b6",
    nodeId: null,
    name: "플리마켓",
    lat: FESTIVAL_MAP_CENTER.lat - 0.0008,
    lng: FESTIVAL_MAP_CENTER.lng + 0.0018,
  },
];

/**
 * 카카오맵에서 부스 핀을 찍고 구역을 묶는 편집 화면.
 * 배치도 사진 업로드/OpenAI 분석은 1차 경로가 아니다.
 */
export function BoothMapEditorFileRegisteredState({
  festivalId,
  seedMockBooths = false,
}: {
  festivalId: string;
  /** `?preview=ready` 개발 프리뷰에서만 더미 부스를 넣는다. */
  seedMockBooths?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const [zoomStep, setZoomStep] = useState(0);
  const [drawTool, setDrawTool] = useState<"select" | "pin">("pin");
  const [mapLoading, mapError] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const festivalQuery = useQuery({
    queryKey: ["managed-festival", festivalId],
    queryFn: () => getManagedFestival(festivalId),
    enabled: festivalId !== "demo" && festivalId !== "mock-preview",
  });
  const mapQuery = useQuery({
    queryKey: ["coordinate-map", festivalId],
    queryFn: () => ensureCoordinateMap(festivalId),
    enabled: !seedMockBooths && festivalId !== "demo" && festivalId !== "mock-preview",
  });
  const editorQuery = useQuery({
    queryKey: ["map-editor", festivalId, mapQuery.data?.mapId],
    queryFn: () => getMapEditor(festivalId, mapQuery.data!.mapId),
    enabled: !!mapQuery.data?.mapId,
  });
  const festivalCenter = useMemo(
    () => primaryFestivalCenter(festivalQuery.data?.locations),
    [festivalQuery.data?.locations],
  );

  const [booths, setBooths] = useState<LocalBoothPin[]>(() => (seedMockBooths ? MOCK_BOOTHS : []));
  const [editRevision, setEditRevision] = useState(0);
  const [deletedNodeIds, setDeletedNodeIds] = useState<string[]>([]);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [zones, setZones] = useState<LocalZone[]>([]);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [expandedZoneIds, setExpandedZoneIds] = useState<Set<string>>(new Set());

  const zoneIdByBoothId = useMemo(() => {
    const map = new Map<string, string>();
    zones.forEach((zone) => zone.boothIds.forEach((id) => map.set(id, zone.id)));
    return map;
  }, [zones]);
  const ungroupedBooths = useMemo(
    () => booths.filter((booth) => !zoneIdByBoothId.has(booth.id)),
    [booths, zoneIdByBoothId],
  );
  // 그룹(구역)에 속한 부스 핀은 그 구역이 선택됐을 때만 지도에 노출한다 —
  // "4-4. 축제부스지도 - 아무것도 선택하지 않은 경우" 화면설계서 기준(최상위구역 폴리곤만 노출).
  const visibleBooths = useMemo(
    () =>
      booths.filter((booth) => {
        const zoneId = zoneIdByBoothId.get(booth.id);
        return !zoneId || zoneId === selectedZoneId;
      }),
    [booths, zoneIdByBoothId, selectedZoneId],
  );

  function toggleZoneExpanded(id: string) {
    setExpandedZoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectZone(zoneId: string) {
    setCheckedIds(new Set());
    setSelectedZoneId(zoneId);
    setExpandedZoneIds((prev) => new Set(prev).add(zoneId));
  }

  // 체크박스 1개만 선택되면 해당 마커로 시선 이동 + 편집 모달 노출.
  // 2개 이상이면 모달 대신 "선택 항목 그룹화" 버튼을 보여준다.
  const selectedId = checkedIds.size === 1 ? Array.from(checkedIds)[0] : null;
  const selectedBooth = useMemo(
    () => booths.find((booth) => booth.id === selectedId) ?? null,
    [booths, selectedId],
  );
  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
  );
  const selectedZoneMembers = useMemo(
    () => (selectedZone ? booths.filter((booth) => selectedZone.boothIds.includes(booth.id)) : []),
    [selectedZone, booths],
  );
  const mapCenter = editorQuery.data?.center ?? mapQuery.data?.center ?? festivalCenter;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!mapQuery.data?.mapId) {
        throw new Error("지도 정보를 불러오지 못했습니다.");
      }
      if (booths.length === 0) {
        throw new Error("저장할 부스가 없습니다.");
      }
      return saveMapEditor(festivalId, mapQuery.data.mapId, {
        baseRevision: editRevision,
        nodes: boothMapPinsToNodeChanges(booths, deletedNodeIds),
      });
    },
    onSuccess: async (response) => {
      setEditRevision(response.editRevision);
      setDeletedNodeIds([]);
      await queryClient.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      const editor = await getMapEditor(festivalId, mapQuery.data!.mapId);
      setBooths(
        editor.nodes
          .map(nodeToLocalBooth)
          .filter((booth): booth is LocalBoothPin => booth !== null),
      );
      toast.success("부스맵이 저장되었습니다.");
    },
    onError: async (error) => {
      if (getApiErrorCode(error) === 40910) {
        toast.error("다른 곳에서 수정되었습니다.", {
          description: "최신 데이터를 다시 불러옵니다.",
        });
        await queryClient.invalidateQueries({ queryKey: ["map-editor", festivalId] });
        if (mapQuery.data?.mapId) {
          const editor = await getMapEditor(festivalId, mapQuery.data.mapId);
          setEditRevision(editor.editRevision);
          setBooths(
            editor.nodes
              .map(nodeToLocalBooth)
              .filter((booth): booth is LocalBoothPin => booth !== null),
          );
          setDeletedNodeIds([]);
        }
        return;
      }
      toast.error(getApiErrorMessage(error, "부스맵 저장에 실패했습니다."));
    },
  });

  useEffect(() => {
    if (seedMockBooths || !editorQuery.data || editorInitialized) {
      return;
    }
    setBooths(
      editorQuery.data.nodes
        .map(nodeToLocalBooth)
        .filter((booth): booth is LocalBoothPin => booth !== null),
    );
    setEditRevision(editorQuery.data.editRevision);
    setEditorInitialized(true);
  }, [editorQuery.data, editorInitialized, seedMockBooths]);

  function addBoothAt(lat: number, lng: number) {
    const id = `booth-${Date.now()}`;
    setBooths((prev) => [
      ...prev,
      {
        id,
        nodeId: null,
        name: `새 부스 ${prev.length + 1}`,
        lat,
        lng,
      },
    ]);
    setSelectedZoneId(null);
    setCheckedIds(new Set([id]));
  }

  function toggleChecked(id: string) {
    setSelectedZoneId(null);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [dragBoothId, setDragBoothId] = useState<string | null>(null);
  // 핸들 아이콘에서 시작한 드래그만 허용한다 — 행 전체를 draggable로 두면
  // 체크박스 클릭이나 텍스트 선택이 자꾸 드래그로 새서 부자연스러워진다.
  const [draggableRowId, setDraggableRowId] = useState<string | null>(null);

  function moveBooth(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setBooths((prev) => {
      const sourceIndex = prev.findIndex((booth) => booth.id === sourceId);
      const targetIndex = prev.findIndex((booth) => booth.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  useEffect(() => {
    setHideNav(true);
    setFullBleed(true);
    return () => {
      setHideNav(false);
      setFullBleed(false);
    };
  }, [setHideNav, setFullBleed]);

  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (event: WheelEvent) => event.preventDefault();
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [mapLoading, mapError]);

  function renderBoothRow(booth: LocalBoothPin, { indent }: { indent: boolean }) {
    return (
      <div
        key={booth.id}
        draggable={draggableRowId === booth.id}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          // 커서를 따라다니는 기본 드래그 고스트 이미지를 숨긴다 — src 없는
          // Image는 "로드 전" 취급돼 크로미움이 행 스냅샷으로 대체해버리므로,
          // 동기적으로 디코딩되는 1x1 투명 GIF data URI를 써서 확실히 비운다.
          event.dataTransfer.setDragImage(getEmptyDragImage(), 0, 0);
          setDragBoothId(booth.id);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (dragBoothId && dragBoothId !== booth.id) moveBooth(dragBoothId, booth.id);
        }}
        onDrop={(event) => event.preventDefault()}
        onDragEnd={() => {
          setDragBoothId(null);
          setDraggableRowId(null);
        }}
        className={`flex items-center gap-2 rounded-md py-2 pl-1 transition-[background-color,opacity] duration-150 ${
          indent ? "pl-7" : ""
        } ${dragBoothId === booth.id ? "opacity-40" : ""} ${
          dragBoothId && dragBoothId !== booth.id ? "hover:bg-zinc-100" : ""
        }`}
      >
        <Checkbox
          checked={checkedIds.has(booth.id)}
          onCheckedChange={() => toggleChecked(booth.id)}
          className="border-zinc-200"
        />
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span
            className={`size-4 shrink-0 ${booth.uncertain ? "text-secondary-600" : "text-primary"}`}
          >
            <RadiobuttonIcon />
          </span>
          <span className="body-regular truncate text-left text-zinc-950">{booth.name}</span>
        </span>
        <span
          onMouseDown={() => setDraggableRowId(booth.id)}
          onMouseUp={() => setDraggableRowId(null)}
          className="shrink-0 cursor-grab touch-none text-zinc-400 active:cursor-grabbing"
        >
          <HamburgerMenuIcon />
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-300">
      {!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || mapError || mapLoading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="body-small text-zinc-600">
            {!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY
              ? "NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다."
              : mapError
                ? "카카오맵을 불러오지 못했습니다."
                : "지도를 불러오는 중..."}
          </p>
        </div>
      ) : (
        <div
          ref={mapWrapperRef}
          className={cn("absolute inset-0 isolate", drawTool === "pin" && "cursor-crosshair")}
        >
          <KakaoMap
            center={mapCenter}
            isPanto={false}
            level={4 + zoomStep}
            scrollwheel={false}
            className="h-full w-full"
            onCreate={(map) => {
              map.setMinLevel(2);
              map.setMaxLevel(8);
            }}
            onClick={(_target, mouseEvent) => {
              if (drawTool !== "pin") return;
              const latLng = mouseEvent.latLng;
              if (!latLng) return;
              addBoothAt(latLng.getLat(), latLng.getLng());
            }}
          >
            {zones.map((zone) => {
              const members = booths.filter((booth) => zone.boothIds.includes(booth.id));
              if (members.length === 0) return null;
              const path = zonePolygonPath(members);
              return (
                <Fragment key={zone.id}>
                  <Polygon
                    path={path}
                    fillColor="#236cf6"
                    fillOpacity={0.1}
                    strokeColor="#236cf6"
                    strokeWeight={2}
                    strokeOpacity={0.8}
                    onClick={() => selectZone(zone.id)}
                  />
                  {path.map((point, index) => (
                    <CustomOverlayMap key={`${zone.id}-${index}`} position={point} zIndex={15}>
                      <span className="block size-2.5 rounded-full border-2 border-primary bg-white shadow" />
                    </CustomOverlayMap>
                  ))}
                </Fragment>
              );
            })}
            {visibleBooths.map((booth) => {
              const isSelected = booth.id === selectedId;
              const dotColor = isSelected
                ? "bg-primary"
                : booth.uncertain
                  ? "bg-secondary-600"
                  : "bg-point-600";
              return (
                <CustomOverlayMap
                  key={booth.id}
                  position={{ lat: booth.lat, lng: booth.lng }}
                  clickable
                  zIndex={isSelected ? 20 : 10}
                >
                  <button
                    type="button"
                    title={booth.name}
                    aria-label={booth.name}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedZoneId(null);
                      setCheckedIds(new Set([booth.id]));
                    }}
                    className={`relative flex items-center justify-center ${
                      isSelected ? "size-8" : "size-3"
                    }`}
                  >
                    {isSelected ? (
                      <span className={`absolute size-8 rounded-full opacity-25 ${dotColor}`} />
                    ) : null}
                    <span
                      className={`relative size-3 rounded-full border-2 border-white shadow ${dotColor}`}
                    />
                  </button>
                </CustomOverlayMap>
              );
            })}
            {selectedBooth ? (
              <CustomOverlayMap
                position={{ lat: selectedBooth.lat, lng: selectedBooth.lng }}
                yAnchor={1.15}
                zIndex={30}
              >
                <MapInfoPopover
                  mode="booth-edit"
                  style={{ position: "static" }}
                  initialName={selectedBooth.name}
                  onConfirm={(name) => {
                    setBooths((prev) =>
                      prev.map((booth) =>
                        booth.id === selectedBooth.id ? { ...booth, name } : booth,
                      ),
                    );
                    setCheckedIds(new Set());
                  }}
                  onCancel={() => setCheckedIds(new Set())}
                  onDelete={() => {
                    if (selectedBooth.nodeId) {
                      setDeletedNodeIds((prev) => [...prev, selectedBooth.nodeId!]);
                    }
                    setBooths((prev) => prev.filter((booth) => booth.id !== selectedBooth.id));
                    setCheckedIds(new Set());
                  }}
                />
              </CustomOverlayMap>
            ) : null}
            {groupPopoverOpen
              ? (() => {
                  const members = booths.filter((booth) => checkedIds.has(booth.id));
                  if (members.length === 0) return null;
                  return (
                    <CustomOverlayMap position={centroidOf(members)} yAnchor={1.15} zIndex={30}>
                      <MapInfoPopover
                        mode="group-create"
                        style={{ position: "static" }}
                        initialName="새 구역"
                        onConfirm={(name) => {
                          const zone: LocalZone = {
                            id: createZoneId(),
                            name,
                            boothIds: Array.from(checkedIds),
                          };
                          setZones((prev) => [...prev, zone]);
                          setExpandedZoneIds((prev) => new Set(prev).add(zone.id));
                          setSelectedZoneId(zone.id);
                          setCheckedIds(new Set());
                          setGroupPopoverOpen(false);
                        }}
                        onCancel={() => setGroupPopoverOpen(false)}
                      />
                    </CustomOverlayMap>
                  );
                })()
              : null}
            {selectedZone && selectedZoneMembers.length > 0 ? (
              <CustomOverlayMap
                position={centroidOf(selectedZoneMembers)}
                yAnchor={1.15}
                zIndex={30}
              >
                <MapInfoPopover
                  mode="zone-edit"
                  style={{ position: "static" }}
                  initialName={selectedZone.name}
                  confirmLabel="등록"
                  hideCancel
                  onChangeType={(type) =>
                    toast.info(
                      `"${type === "pin" ? "핀" : type === "polygon" ? "폴리곤" : "라인"}"으로 유형 변경은 아직 연결되지 않았습니다`,
                      { description: "화면 레이아웃만 우선 구현된 상태입니다." },
                    )
                  }
                  onConfirm={(name) => {
                    setZones((prev) =>
                      prev.map((zone) => (zone.id === selectedZone.id ? { ...zone, name } : zone)),
                    );
                    setSelectedZoneId(null);
                  }}
                  onCancel={() => setSelectedZoneId(null)}
                  onDelete={() => {
                    setZones((prev) => prev.filter((zone) => zone.id !== selectedZone.id));
                    setSelectedZoneId(null);
                  }}
                />
              </CustomOverlayMap>
            ) : null}
          </KakaoMap>
        </div>
      )}

      <div className="absolute top-10 bottom-10 left-8 w-72">
        <MapSidePanel className="h-full">
          <p className="body-large-bold text-zinc-950">
            축제부스 <span className="text-primary">{booths.length}</span>
          </p>
          <div className="flex flex-col gap-2 rounded-md bg-zinc-100 px-4 py-3 text-left">
            <p className="body-small-bold text-zinc-950">
              {booths.length === 0 ? "아직 찍은 부스가 없습니다." : "지도에서 부스를 편집하세요."}
            </p>
            <p className="body-caption text-zinc-950">
              {booths.length === 0
                ? "오른쪽 핀 도구를 켠 뒤 지도를 클릭해 부스를 추가하세요."
                : "핀을 선택해 이름을 바꾸고, 여러 개를 골라 구역으로 묶을 수 있습니다."}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            {zones.map((zone) => {
              const members = booths.filter((booth) => zone.boothIds.includes(booth.id));
              const expanded = expandedZoneIds.has(zone.id);
              return (
                <div key={zone.id} className="flex flex-col">
                  <div
                    className={`flex items-center gap-2 rounded-md py-2 pl-1 ${
                      selectedZoneId === zone.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={expanded ? "구역 접기" : "구역 펼치기"}
                      onClick={() => toggleZoneExpanded(zone.id)}
                      className="shrink-0 text-zinc-500"
                    >
                      {expanded ? (
                        <ChevronUpIcon className="size-4" />
                      ) : (
                        <ChevronDownIcon className="size-4" />
                      )}
                    </button>
                    <Checkbox
                      checked={selectedZoneId === zone.id}
                      onCheckedChange={(checked) =>
                        checked ? selectZone(zone.id) : setSelectedZoneId(null)
                      }
                      className="border-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={() => selectZone(zone.id)}
                      className="flex min-w-0 flex-1 items-center gap-1 text-left"
                    >
                      <span className="size-4 shrink-0 text-primary">
                        <DimensionsIcon />
                      </span>
                      <span className="body-regular truncate text-zinc-950">{zone.name}</span>
                      <span className="body-small text-primary">{members.length}</span>
                    </button>
                    <span className="shrink-0 cursor-grab touch-none text-zinc-400">
                      <HamburgerMenuIcon />
                    </span>
                  </div>
                  {expanded
                    ? members.map((booth) => renderBoothRow(booth, { indent: true }))
                    : null}
                </div>
              );
            })}
            {ungroupedBooths.map((booth) => renderBoothRow(booth, { indent: false }))}
          </div>

          {checkedIds.size >= 2 ? (
            <Button
              type="button"
              variant="primary"
              className="mt-auto w-full"
              onClick={() => setGroupPopoverOpen(true)}
            >
              그룹화
            </Button>
          ) : null}
        </MapSidePanel>
      </div>

      <div className="absolute top-10 right-8 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span title="편집 내용이 없어 실행취소할 수 없습니다.">
            <IconButton
              icon={<ResetIcon className="size-5" />}
              aria-label="실행취소"
              disabled
              className="text-zinc-500"
            />
          </span>
          <span title="편집 내용이 없어 다시실행할 수 없습니다.">
            <IconButton
              icon={<ResetIcon className="size-5 -scale-x-100" />}
              aria-label="다시실행"
              disabled
              className="text-zinc-500"
            />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="primary" onClick={() => setSaveDialogOpen(true)}>
            저장하기
          </Button>
        </div>
        <IconButton
          icon={<Cross2Icon className="size-5" />}
          aria-label="닫기"
          className="text-zinc-950"
          onClick={() => setCloseDialogOpen(true)}
        />
      </div>

      <div className="absolute right-8 bottom-10 flex flex-col items-center gap-5">
        <div className="flex flex-col gap-1">
          <IconButton
            icon={<RadiobuttonIcon className="size-5" />}
            aria-label="핀 추가"
            aria-pressed={drawTool === "pin"}
            className={cn("text-zinc-950", drawTool === "pin" && "ring-2 ring-primary")}
            onClick={() => setDrawTool((tool) => (tool === "pin" ? "select" : "pin"))}
          />
          <span title="1차는 핀만 지원합니다.">
            <IconButton
              icon={<DimensionsIcon className="size-5" />}
              aria-label="폴리곤 추가"
              disabled
              className="text-zinc-950"
            />
          </span>
          <span title="1차는 핀만 지원합니다.">
            <IconButton
              icon={<RulerHorizontalIcon className="size-5" />}
              aria-label="라인 추가"
              disabled
              className="text-zinc-950"
            />
          </span>
        </div>
        <MapZoomControls
          onZoomIn={() => setZoomStep((step) => Math.max(step - 1, -2))}
          onZoomOut={() => setZoomStep((step) => Math.min(step + 1, 4))}
        />
      </div>

      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="저장하시겠습니까?"
        confirmLabel="저장"
        confirmVariant="primary"
        onConfirm={() => {
          setSaveDialogOpen(false);
          saveMutation.mutate();
        }}
      />
      <ConfirmDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        title="나가시겠습니까?"
        description="저장하지 않은 내용은 사라집니다."
        confirmLabel="나가기"
        confirmVariant="destructive"
        onConfirm={() => router.push(`/console/festivals/${festivalId}`)}
      />
    </div>
  );
}
