"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomOverlayMap, Map as KakaoMap, Polygon, useKakaoLoader } from "react-kakao-maps-sdk";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Cross2Icon,
  DimensionsIcon,
  FileIcon,
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
import { FESTIVAL_MAP_CENTER } from "@/features/dashboard/mockData";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { MapInfoPopover } from "./MapInfoPopover";

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

interface MockBooth {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** 자동 매핑 신뢰도가 낮아 확인이 필요한 항목 — 마커를 secondary 색상으로 표시한다. */
  uncertain?: boolean;
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
function zonePolygonPath(members: MockBooth[]) {
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

function centroidOf(members: MockBooth[]) {
  return {
    lat: members.reduce((sum, booth) => sum + booth.lat, 0) / members.length,
    lng: members.reduce((sum, booth) => sum + booth.lng, 0) / members.length,
  };
}

/**
 * TODO(api/map-preview): 자동 매핑된 부스의 지도 좌표/이름/신뢰도와 구역 관계를
 * 조회하는 API가 없다. 이 데이터는 `?preview=ready` 개발 프리뷰에서만 사용한다.
 */
const MOCK_BOOTHS: MockBooth[] = [
  {
    id: "b1",
    name: "CU편의점",
    lat: FESTIVAL_MAP_CENTER.lat + 0.0032,
    lng: FESTIVAL_MAP_CENTER.lng - 0.0004,
  },
  {
    id: "b2",
    name: "(주)대정 김밥공장",
    lat: FESTIVAL_MAP_CENTER.lat + 0.0016,
    lng: FESTIVAL_MAP_CENTER.lng - 0.0022,
    uncertain: true,
  },
  {
    id: "b3",
    name: "김천특산품 홍보관",
    lat: FESTIVAL_MAP_CENTER.lat + 0.0018,
    lng: FESTIVAL_MAP_CENTER.lng + 0.0028,
  },
  { id: "b4", name: "메인무대", lat: FESTIVAL_MAP_CENTER.lat, lng: FESTIVAL_MAP_CENTER.lng },
  {
    id: "b5",
    name: "명품로컬김밥판매존",
    lat: FESTIVAL_MAP_CENTER.lat - 0.0016,
    lng: FESTIVAL_MAP_CENTER.lng - 0.0012,
    uncertain: true,
  },
  {
    id: "b6",
    name: "플리마켓",
    lat: FESTIVAL_MAP_CENTER.lat - 0.0008,
    lng: FESTIVAL_MAP_CENTER.lng + 0.0018,
  },
];

/**
 * "축제부스지도 - 등록된 파일이 있는 경우" 화면.
 * [[BoothMapEditorEmptyState]]와 동일한 레이아웃(카카오맵 배경 + 좌측 카드 +
 * 우측 상단 툴바 + 우측 하단 도구)을 그대로 쓰되, 파일이 이미 등록된 상태를
 * 반영한 1차 버전이다. 부스 목록/마커는 더미 데이터이고, 실제 자동 매핑
 * 결과 연동·구역 저장은 아직 붙이지 않았다.
 */
export function BoothMapEditorFileRegisteredState({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const [zoomStep, setZoomStep] = useState(0);
  const [mapLoading, mapError] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const [booths, setBooths] = useState(MOCK_BOOTHS);
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
  const mapCenter = selectedBooth
    ? { lat: selectedBooth.lat, lng: selectedBooth.lng }
    : FESTIVAL_MAP_CENTER;

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
  }, []);

  function renderBoothRow(booth: MockBooth, { indent }: { indent: boolean }) {
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
      {process.env.NEXT_PUBLIC_KAKAO_MAP_KEY && !mapError && !mapLoading ? (
        <div ref={mapWrapperRef} className="absolute inset-0 isolate">
          <KakaoMap
            center={mapCenter}
            level={4 + zoomStep}
            scrollwheel={false}
            className="h-full w-full"
            onCreate={(map) => {
              map.setMinLevel(2);
              map.setMaxLevel(8);
            }}
          >
            {zones.map((zone) => {
              const members = booths.filter((booth) => zone.boothIds.includes(booth.id));
              if (members.length === 0) return null;
              const path = zonePolygonPath(members);
              return (
                <div key={zone.id}>
                  <Polygon
                    path={path}
                    fillColor="#236cf6"
                    fillOpacity={0.1}
                    strokeColor="#236cf6"
                    strokeWeight={2}
                    strokeOpacity={0.8}
                    onClick={() => selectZone(zone.id)}
                  />
                  {/* 네이버지도 면적 계산 도구 참고 — 폴리곤 꼭짓점에 핸들을 표시한다(현재는 표시만, 드래그 편집은 아직 없음). */}
                  {path.map((point, index) => (
                    <CustomOverlayMap key={index} position={point} zIndex={15}>
                      <span className="block size-2.5 rounded-full border-2 border-primary bg-white shadow" />
                    </CustomOverlayMap>
                  ))}
                </div>
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
                    onClick={() => {
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
      ) : null}

      <div className="absolute top-10 bottom-10 left-8 flex items-start gap-5">
        <MapSidePanel>
          <p className="body-large-bold text-zinc-950">
            축제부스 <span className="text-primary">{booths.length}</span>
          </p>
          <div className="flex flex-col gap-2 rounded-md bg-zinc-100 px-4 py-3 text-left">
            <p className="body-small-bold text-zinc-950">자동 매핑 결과입니다.</p>
            <p className="body-caption text-zinc-950">
              이미지 분석으로 축제 구역과 시설을 추출했어요. 수정이 필요한 항목을 선택하세요.
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

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            toast.error("아직 재업로드할 수 없어요", {
              description: "등록된 배치도를 교체하는 API가 아직 연결되지 않았습니다.",
            });
          }
          if (replaceInputRef.current) replaceInputRef.current.value = "";
        }}
      />

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
          <Button
            type="button"
            variant="outline"
            icon={<FileIcon />}
            onClick={() => replaceInputRef.current?.click()}
          >
            파일 재업로드
          </Button>
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
            className="text-zinc-950"
          />
          <span title="자유 폴리곤 그리기는 아직 지원하지 않아요.">
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
            className="text-zinc-950"
          />
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
          toast.info("저장 기능은 아직 연결되지 않았습니다", {
            description: "화면 레이아웃만 우선 구현된 상태입니다.",
          });
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
