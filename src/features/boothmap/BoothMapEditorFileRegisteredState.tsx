"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CustomOverlayMap,
  Map as KakaoMap,
  Polygon,
  Polyline,
  Rectangle,
} from "react-kakao-maps-sdk";
import {
  CheckCircledIcon,
  ClockIcon,
  CornersIcon,
  Cross2Icon,
  DimensionsIcon,
  FileIcon,
  GroupIcon,
  HamburgerMenuIcon,
  ImageIcon,
  PlusIcon,
  RadiobuttonIcon,
  ResetIcon,
  RulerHorizontalIcon,
} from "@radix-ui/react-icons";
import { toast } from "sonner";
import { useKakaoMapLoader } from "@/lib/kakaoMapLoader";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { MapSidePanel } from "@/components/map/MapSidePanel";
import { MapZoomControls } from "@/components/map/MapZoomControls";
import { getFestivalDashboard, getFestivalQueues } from "@/features/dashboard/api";
import type { FestivalQueue, FestivalQueueList } from "@/features/staffMap/types";
import { QueuePlanPanel } from "./QueuePlanPanel";
import { ShapeEditSection } from "./ShapeEditSection";
import {
  midpointOf,
  presetPolygonPoints,
  straightenLine,
  type PolygonPreset,
} from "./shapeGeometry";
import { BoothQueueActions } from "./BoothQueueActions";
import { BoothSelectionBar } from "./BoothSelectionBar";
import { QueuePointEditor } from "./QueuePointEditor";
import { snapToQueuePath } from "./queueSnap";
import { getQueuePlan } from "./queuePlanApi";
import { getManagedFestival } from "@/features/festivals/api";
import { updateQueueTailAsAdmin as updateQueueTail } from "@/features/dashboard/api";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/httpError";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { cn } from "@/lib/utils";
import {
  approveBooths,
  ensureCoordinateMap,
  getMapEditor,
  publishBoothMap,
  replaceFestivalMap,
  saveMapEditor,
  unpublishBoothMap,
  uploadMapOverlay,
} from "./api";
import { isPanModifier, isTypingTarget } from "./editorGestures";
import {
  boothMapPinsToNodeChanges,
  partitionEditorNodes,
  SHAPE_MINIMUM_POINTS,
  type LocalBoothPin,
  type LocalMapShape,
  type PreservedNode,
} from "./geometryWgs84";
import type { LatLng } from "./latLng";
import {
  presentationBoundary,
  presentationOverlay,
  type LocalPamphletOverlay,
} from "./mapPresentation";
import { cornersFromAnchor } from "./overlayProjection";
import { PamphletOverlay } from "./PamphletOverlay";
import {
  containsPoint,
  uniqueVertices,
  validateBoundary,
  withoutClosingDuplicate,
} from "./polygonGeometry";
import { boothsToQueuePathItems, QueuePathLayer } from "./QueuePathLayer";
import { MapAnalysisProgressCard } from "./MapAnalysisProgressCard";
import { NODE_TYPE_LABEL, nodeTypeIcon, PIN_TYPE_OPTIONS } from "./nodeTypeIcons";
import { buildZoneChanges } from "./zonePayload";
import { MapInfoPopover } from "./MapInfoPopover";
import { fitBoothBounds } from "./fitBoothBounds";
import { primaryFestivalCenter } from "./mapCenter";
import type { CreateCoordinateMapResponse, MapAnalysisStatusResponse, NodeType } from "./types";
import {
  boundsContainPoint,
  boundsFromCorners,
  boundsTouchPoints,
  deltaBetween,
  isNegligibleBounds,
  shiftPoint,
  shiftPoints,
  distanceToPolylinePx,
  lineUpPoints,
  pointInPolygonPx,
  type LatLngBounds,
  type LatLngDelta,
  type Point2D,
} from "./mapSelection";
import { useEditHistory } from "./useEditHistory";
import { useMapAnalysis } from "./useMapAnalysis";
import { ZoneListItem } from "./ZoneListItem";

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
  return crypto.randomUUID();
}

/** 구역 멤버를 감싸는 최소 볼록 다각형에 여백을 더해 구역 경계를 만든다. */
function zonePolygonPath(members: LocalBoothPin[]) {
  const pad = 0.0006;
  const points = members
    .map(({ lat, lng }) => ({ lat, lng }))
    .sort((a, b) => a.lng - b.lng || a.lat - b.lat);

  if (points.length < 3) {
    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    return [
      { lat: Math.max(...lats) + pad, lng: Math.min(...lngs) - pad },
      { lat: Math.max(...lats) + pad, lng: Math.max(...lngs) + pad },
      { lat: Math.min(...lats) - pad, lng: Math.max(...lngs) + pad },
      { lat: Math.min(...lats) - pad, lng: Math.min(...lngs) - pad },
    ];
  }

  const cross = (
    origin: (typeof points)[number],
    a: (typeof points)[number],
    b: (typeof points)[number],
  ) => (a.lng - origin.lng) * (b.lat - origin.lat) - (a.lat - origin.lat) * (b.lng - origin.lng);
  const halfHull = (source: typeof points) => {
    const hull: typeof points = [];
    source.forEach((point) => {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
        hull.pop();
      }
      hull.push(point);
    });
    return hull;
  };
  const hull = [...halfHull(points).slice(0, -1), ...halfHull([...points].reverse()).slice(0, -1)];
  const center = centroidOf(members);
  return hull.map((point) => ({
    lat: point.lat + (point.lat >= center.lat ? pad : -pad),
    lng: point.lng + (point.lng >= center.lng ? pad : -pad),
  }));
}

function centroidOf(members: LocalBoothPin[]) {
  return {
    lat: members.reduce((sum, booth) => sum + booth.lat, 0) / members.length,
    lng: members.reduce((sum, booth) => sum + booth.lng, 0) / members.length,
  };
}

function applyPartitionedNodes(
  nodes: Parameters<typeof partitionEditorNodes>[0],
  setBooths: (pins: LocalBoothPin[]) => void,
  setShapes: (shapes: LocalMapShape[]) => void,
  setPreservedNodes: (nodes: PreservedNode[]) => void,
) {
  const partitioned = partitionEditorNodes(nodes);
  setBooths(partitioned.pins);
  setShapes(partitioned.shapes);
  setPreservedNodes(partitioned.preserved);
  if (partitioned.preserved.length > 0) {
    toast.warning("일부 도형은 이 지도에서 그리지 않고 그대로 보존합니다.", {
      description: partitioned.preserved[0]?.reason,
    });
  }
}

/*
  말풍선은 고른 대상 위에 뜬다. yAnchor를 정확히 1로 두면 말풍선 꼬리가 핀에 닿아
  핀을 가린다. 높이의 12%만큼 더 올려 핀이 보이게 띄운다.
*/
const POPOVER_ANCHORS = { xAnchor: 0.5, yAnchor: 1.12 } as const;

type PamphletUploadStatus =
  "pending" | "uploading" | "failed" | "uploaded-unsaved" | "saved-modified" | "saved";

const PAMPHLET_STATUS: Record<PamphletUploadStatus, { label: string; className: string }> = {
  pending: { label: "업로드 전 · 저장을 누르면 올라갑니다", className: "text-point-600" },
  uploading: { label: "업로드 중…", className: "text-zinc-500" },
  failed: { label: "업로드 실패 · 다시 저장해 주세요", className: "text-error" },
  "uploaded-unsaved": { label: "업로드됨 · 배치 저장 전", className: "text-point-600" },
  "saved-modified": { label: "업로드 완료 · 변경 저장 전", className: "text-point-600" },
  saved: { label: "업로드 완료", className: "text-primary" },
};

function PamphletStatusLabel({ status }: { status: PamphletUploadStatus }) {
  const { label, className } = PAMPHLET_STATUS[status];
  return (
    <p role="status" className={cn("body-caption flex items-center gap-1", className)}>
      {status === "saved" ? <CheckCircledIcon className="size-3.5 shrink-0" /> : null}
      {label}
    </p>
  );
}

/** 지도에서 고를 수 있는 그리기 도구. 핀·폴리곤·라인은 노드, 경계·대기줄은 표시 설정이다. */
type DrawTool = "select" | "marquee" | "pin" | "polygon" | "line" | "boundary" | "queue-line";

/** 폴리곤·라인의 기본 노드 유형. 세부 유형은 도형을 고른 뒤 팝오버에서 바꾼다. */
const SHAPE_NODE_TYPE: Record<"polygon" | "line", NodeType> = {
  polygon: "OPEN_SPACE",
  line: "PATH",
};
const SHAPE_LABEL: Record<"polygon" | "line", string> = {
  polygon: "구역",
  line: "통로",
};

/** 지도 클릭 두 번이 사실상 같은 자리인지. 서버는 이어진 중복 점을 거절한다. */
function isSamePlace(a: LatLng | undefined, b: LatLng, tolerance = 0.000015) {
  if (!a) return false;
  return Math.abs(a.lat - b.lat) < tolerance && Math.abs(a.lng - b.lng) < tolerance;
}

/** 첫 꼭짓점 근처를 다시 눌렀고 최소 점수를 채웠는지. 도형을 닫는 신호로 쓴다. */
function closesDraft(points: LatLng[], point: LatLng, minimum: number, tolerance = 0.00005) {
  return points.length >= minimum && isSamePlace(points[0], point, tolerance);
}

/** 노드 유형이 어떤 대분류에 속하는지. 설계서 "5. 유형 변경하기"의 핀·폴리곤·라인이다. */
function categoryOfNodeType(nodeType: NodeType): "pin" | "polygon" | "line" {
  if (nodeType === "OPEN_SPACE" || nodeType === "PARKING") return "polygon";
  if (nodeType === "PATH") return "line";
  return "pin";
}

/*
  지도 확대 단계. 카카오는 숫자가 작을수록 확대다. 지도를 만들 때 거는
  setMinLevel/setMaxLevel과 같은 값을 쓰지 않으면, 버튼으로는 더 눌리는데 지도는
  그대로인 구간이 생긴다.
*/
const MIN_MAP_LEVEL = 1;
const MAX_MAP_LEVEL = 8;
const DEFAULT_MAP_LEVEL = 2;

/** 위도 1도 ≈ 111,320m. 기본 도형 크기를 미터로 잡을 때 쓴다. */
const METERS_PER_DEGREE_LAT = 111320;

/** 핀을 도형으로 바꿀 때 쓰는 기본 모양. 한 변 약 40m 사각형(또는 40m 선). */
function defaultShapePoints(
  center: { lat: number; lng: number },
  kind: "polygon" | "line",
  meters = 40,
) {
  const halfLat = meters / 2 / METERS_PER_DEGREE_LAT;
  const halfLng =
    meters / 2 / (METERS_PER_DEGREE_LAT * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
  if (kind === "line") {
    return [
      { lat: center.lat, lng: center.lng - halfLng },
      { lat: center.lat, lng: center.lng + halfLng },
    ];
  }
  return [
    { lat: center.lat + halfLat, lng: center.lng - halfLng },
    { lat: center.lat + halfLat, lng: center.lng + halfLng },
    { lat: center.lat - halfLat, lng: center.lng + halfLng },
    { lat: center.lat - halfLat, lng: center.lng - halfLng },
  ];
}

/** 도형 이름표와 팝오버를 띄울 기준점. 폴리곤은 무게중심, 라인은 가운데 꼭짓점을 쓴다. */
function shapeAnchor(shape: LocalMapShape) {
  if (shape.kind === "line") {
    return shape.points[Math.floor(shape.points.length / 2)];
  }
  return {
    lat: shape.points.reduce((sum, point) => sum + point.lat, 0) / shape.points.length,
    lng: shape.points.reduce((sum, point) => sum + point.lng, 0) / shape.points.length,
  };
}

/**
 * 도형 말풍선을 띄울 기준점. 무게중심에 띄우면 말풍선이 도형 위쪽 절반과 그 위의
 * 점 손잡이를 덮어 모양을 고칠 수 없어서, 도형의 가장 위쪽 높이에 맞춘다.
 */
function shapePopoverAnchor(shape: LocalMapShape) {
  const top = Math.max(...shape.points.map((point) => point.lat));
  if (shape.kind === "line") {
    return shape.points.find((point) => point.lat === top) ?? shape.points[0];
  }
  return { lat: top, lng: shapeAnchor(shape).lng };
}

/**
 * 카카오맵에서 부스 핀을 찍고 구역을 묶는 편집 화면.
 *
 * 배치도 이미지를 올리면 AI가 부스를 찾아 핀으로 뿌려주고(schema 2.0 위경도),
 * 관리자는 그 핀을 끌어 보정한다. 분석이 도는 동안에는 백엔드가 저장을 거부하므로
 * 편집·저장을 화면에서도 막는다.
 */
export function BoothMapEditorFileRegisteredState({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const setToastBelowActionBar = useConsoleUiStore((state) => state.setToastBelowActionBar);
  const [mapLevel, setMapLevel] = useState(DEFAULT_MAP_LEVEL);
  const [boothListOpen, setBoothListOpen] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>("select");
  const [pendingPinType, setPendingPinType] = useState<NodeType>("BOOTH");
  const [pinTypeMenuOpen, setPinTypeMenuOpen] = useState(false);
  const [mapLoading, mapError] = useKakaoMapLoader();
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const boothListRef = useRef<HTMLDivElement>(null);
  const mapToolsRef = useRef<HTMLDivElement>(null);
  /** 지도 위쪽 버튼 줄. 말풍선이 그 아래로 들어가도록 높이를 잰다. */
  const topActionBarRef = useRef<HTMLDivElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const overlayFileInputRef = useRef<HTMLInputElement>(null);
  const localImageFiles = useRef(new Map<string, File>());
  /*
    서버는 팜플렛 원본 파일명을 돌려주지 않는다. 이번 편집 중에 고른 파일만 이름을 알 수 있어
    objectURL과 업로드 후 assetId 양쪽으로 기억해 둔다. 편집 스냅샷과는 분리한다.
  */
  const [pamphletFileNames, setPamphletFileNames] = useState<Record<string, string>>({});
  const uploadedPamphletName = useRef<string | null>(null);
  const kakaoMapRef = useRef<kakao.maps.Map | null>(null);
  const [kakaoMap, setKakaoMap] = useState<kakao.maps.Map | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [removePamphletOpen, setRemovePamphletOpen] = useState(false);
  const [clearQueuePathOpen, setClearQueuePathOpen] = useState(false);
  const [queueImportOpen, setQueueImportOpen] = useState(false);
  /*
    분석 안내를 닫아 둔 작업 키. 새 분석이 시작되거나 상태가 바뀌면 다시 띄운다 —
    한 번 닫았다고 다음 결과까지 숨기면 무엇이 끝났는지 알 수 없다.
  */
  const [dismissedAnalysisKey, setDismissedAnalysisKey] = useState<string | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  /*
    지도 위에서 끌고 있는 핀의 임시 위치. 끄는 동안에는 booths를 건드리지 않고 이 값만
    갱신한다 — 매 프레임 booths를 바꾸면 드래그 한 번에 실행취소 기록이 수십 개 쌓인다.
    실제 좌표는 손을 뗄 때 한 번만 반영해 되돌리기 한 번으로 원위치되게 한다.
  */
  const [moveDraft, setMoveDraft] = useState<{ ids: Set<string>; delta: LatLngDelta } | null>(null);
  /** 드래그로 끝난 포인터인지. 이 값이 true면 이어서 오는 click을 무시한다. */
  const movedRef = useRef(false);
  /** 핀 위에 커서가 올라와 있는지. 지도 드래그 잠금을 언제 풀지 판단하는 데 쓴다. */
  const pinHoveredRef = useRef(false);
  /** 지금 무언가를 끌고 있는지. 상태(moveDraft)는 이벤트 핸들러에서 늦게 보여 ref로 따로 둔다. */
  const movingRef = useRef(false);
  /** 드래그 박스로 고르는 중인 범위. 손을 뗄 때 이 안에 걸친 것을 모두 고른다. */
  const [marquee, setMarquee] = useState<LatLngBounds | null>(null);
  const festivalQuery = useQuery({
    queryKey: ["managed-festival", festivalId],
    queryFn: () => getManagedFestival(festivalId),
  });
  const mapQuery = useQuery({
    queryKey: ["coordinate-map", festivalId],
    queryFn: () => ensureCoordinateMap(festivalId),
    // 축제 장소에 위경도가 없으면 400이 확정이라 재시도하지 않고 바로 안내한다.
    retry: false,
  });
  const editorQuery = useQuery({
    queryKey: ["map-editor", festivalId, mapQuery.data?.mapId],
    queryFn: () => getMapEditor(festivalId, mapQuery.data!.mapId),
    enabled: !!mapQuery.data?.mapId,
  });
  const dashboardQuery = useQuery({
    queryKey: ["festival-dashboard", festivalId],
    queryFn: () => getFestivalDashboard(festivalId),
  });
  const queuesQuery = useQuery({
    queryKey: ["festival-queues", festivalId],
    queryFn: () => getFestivalQueues(festivalId),
  });
  const festivalCenter = useMemo(
    () => primaryFestivalCenter(festivalQuery.data?.locations),
    [festivalQuery.data?.locations],
  );

  const [booths, setBooths] = useState<LocalBoothPin[]>([]);
  const [editRevision, setEditRevision] = useState(0);
  const [deletedNodeIds, setDeletedNodeIds] = useState<string[]>([]);
  // 로컬 상태를 서버 데이터로 다시 채워야 할 때 올리는 값. 지도가 바뀌거나 AI 분석이
  // 끝나면 올라간다. 편집 중인 내용을 임의로 날리지 않도록 그 두 경우에만 올린다.
  const [seedToken, setSeedToken] = useState(0);
  const [seededKey, setSeededKey] = useState<string | null>(null);
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [editingBoothId, setEditingBoothId] = useState<string | null>(null);
  const [zones, setZones] = useState<LocalZone[]>([]);
  /** 지도 위에 직접 그린 폴리곤·라인. 서버의 POLYGON/POLYLINE 노드와 1:1로 대응한다. */
  const [shapes, setShapes] = useState<LocalMapShape[]>([]);
  const [preservedNodes, setPreservedNodes] = useState<PreservedNode[]>([]);
  const [siteBoundary, setSiteBoundary] = useState<LatLng[] | null>(null);
  const [boundaryDraft, setBoundaryDraft] = useState<LatLng[]>([]);
  const [deleteBoundaryOpen, setDeleteBoundaryOpen] = useState(false);
  const [pamphlet, setPamphlet] = useState<LocalPamphletOverlay | null>(null);
  /** 서버에 저장된 팜플렛이 있는지. 화면에서 지웠을 때 삭제 요청을 보낼지 판단한다. */
  const serverHasOverlay = Boolean(editorQuery.data?.presentation?.overlay);
  const [queueDraft, setQueueDraft] = useState<LatLng[]>([]);
  const [queueMode, setQueueMode] = useState<"current" | "plan">("current");
  const [queueDraftRevision, setQueueDraftRevision] = useState<number | undefined>();
  const [queueTailOnly, setQueueTailOnly] = useState(false);
  const [queuePlanBusy, setQueuePlanBusy] = useState(false);
  const [showQueueCoordinates, setShowQueueCoordinates] = useState(false);
  const [queueDraftId, setQueueDraftId] = useState<string | null>(null);
  const [queueSaveError, setQueueSaveError] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [modifierHeld, setModifierHeld] = useState(false);
  /** Shift를 누르고 있는지. 눌린 동안에는 클릭이 «선택에 더하기», 드래그가 «범위 선택»이 된다. */
  const [shiftHeld, setShiftHeld] = useState(false);
  /** 지금 찍고 있는 도형의 꼭짓점들. "그리기 완료"를 눌러야 shapes로 넘어간다. */
  const [draftPoints, setDraftPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  /** 끌고 있는 도형 꼭짓점의 임시 위치. 손을 뗄 때 한 번만 shapes에 반영한다. */
  const [draggingVertex, setDraggingVertex] = useState<{
    shapeId: string;
    index: number;
    lat: number;
    lng: number;
  } | null>(null);
  const vertexDraggingRef = useRef(false);
  const vertexHoveredRef = useRef(false);
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [expandedZoneIds, setExpandedZoneIds] = useState<Set<string>>(new Set());

  const zoneIdByBoothId = useMemo(() => {
    const map = new Map<string, string>();
    zones.forEach((zone) => zone.boothIds.forEach((id) => map.set(id, zone.id)));
    return map;
  }, [zones]);
  /*
    화면설계서 4-6의 "상위구역". 구역 폴리곤 안에 들어온 부스를 그 구역의 하위로 본다.
    구역과 부스를 잇는 필드를 따로 두지 않고 좌표로 판정하므로, 저장했다 다시 불러와도
    소속이 그대로 살아난다.
  */
  const polygonShapes = useMemo(() => shapes.filter((shape) => shape.kind === "polygon"), [shapes]);
  const lineShapes = useMemo(() => shapes.filter((shape) => shape.kind === "line"), [shapes]);
  const shapeIdByBoothId = useMemo(() => {
    const map = new Map<string, string>();
    booths.forEach((booth) => {
      // 구역 멤버로 저장되는 건 부스뿐이다(buildZoneChanges). 화장실·입구까지 세면
      // 화면에는 「8」이 뜨는데 서버에는 4개만 들어가 숫자가 어긋난다.
      if (booth.nodeType !== "BOOTH") return;
      const owner = polygonShapes.find((shape) => containsPoint(shape.points, booth));
      if (owner) map.set(booth.id, owner.id);
    });
    return map;
  }, [booths, polygonShapes]);
  /*
    저장하면 폴리곤이 구역으로도 저장되므로, 다시 불러오면 같은 구역이 zones와
    polygonShapes 양쪽에 있다. 그대로 두면 목록에 두 번 나오고 지도에도 폴리곤 윤곽이
    두 겹으로 그려진다. 폴리곤이 원본이므로 폴리곤 쪽만 남긴다.
  */
  const zoneIdsDrawnAsShape = useMemo(
    () => new Set(polygonShapes.map((shape) => shape.nodeId ?? shape.id)),
    [polygonShapes],
  );
  const boothOnlyCount = useMemo(
    () => booths.filter((booth) => booth.nodeType === "BOOTH").length,
    [booths],
  );
  const standaloneZones = useMemo(
    () => zones.filter((zone) => !zoneIdsDrawnAsShape.has(zone.id)),
    [zones, zoneIdsDrawnAsShape],
  );
  const ungroupedBooths = useMemo(
    () =>
      booths.filter((booth) => !zoneIdByBoothId.has(booth.id) && !shapeIdByBoothId.has(booth.id)),
    [booths, zoneIdByBoothId, shapeIdByBoothId],
  );
  // 그룹(구역)에 속한 부스 핀은 그 구역이 선택됐을 때만 지도에 노출한다 —
  // "4-4. 축제부스지도 - 아무것도 선택하지 않은 경우" 화면설계서 기준(최상위구역 폴리곤만 노출).
  const visibleBooths = useMemo(
    () =>
      booths.filter((booth) => {
        const zoneId = zoneIdByBoothId.get(booth.id);
        // 골라 둔 부스는 구역에 묶여 있어도 남긴다 — 고른 것이 안 보이면 함께 옮길 수 없다.
        return !zoneId || zoneId === selectedZoneId || checkedIds.has(booth.id);
      }),
    [booths, zoneIdByBoothId, selectedZoneId, checkedIds],
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
  const selectedId = editingBoothId;
  const selectedBooth = useMemo(
    () => booths.find((booth) => booth.id === selectedId) ?? null,
    [booths, selectedId],
  );
  const selectedBoothZone = useMemo(
    () =>
      selectedBooth
        ? (zones.find((zone) => zone.boothIds.includes(selectedBooth.id)) ?? null)
        : null,
    [selectedBooth, zones],
  );
  /*
    말풍선의 "상위구역". 구역 폴리곤 안에 있으면 그 구역 이름을, 아니면 묶어 둔
    그룹 이름을 쓴다. 둘 다 없으면 설계서 모달처럼 "-"로 남긴다.
  */
  const selectedBoothParentName = useMemo(() => {
    if (!selectedBooth) return "-";
    const owner = polygonShapes.find(
      (shape) => shape.id === shapeIdByBoothId.get(selectedBooth.id),
    );
    return owner?.name ?? selectedBoothZone?.name ?? "-";
  }, [selectedBooth, polygonShapes, shapeIdByBoothId, selectedBoothZone]);
  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
  );
  const selectedZoneMembers = useMemo(
    () => (selectedZone ? booths.filter((booth) => selectedZone.boothIds.includes(booth.id)) : []),
    [selectedZone, booths],
  );

  const selectedShape = useMemo(
    () => shapes.find((shape) => shape.id === selectedShapeId) ?? null,
    [shapes, selectedShapeId],
  );
  /*
    말풍선은 고른 대상 위에 뜬다. 부스뿐 아니라 도형(구역·통로)을 골랐을 때도 같은 자리로
    맞춰야 상단 버튼 줄에 가리지 않는다. 도형은 무게중심을 기준점으로 쓴다.
  */
  const selectedFocus = useMemo(() => {
    if (selectedBooth) return { lat: selectedBooth.lat, lng: selectedBooth.lng };
    if (selectedShape) return shapePopoverAnchor(selectedShape);
    return null;
  }, [selectedBooth, selectedShape]);
  const selectedLatitude = selectedFocus?.lat;
  const selectedLongitude = selectedFocus?.lng;
  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    if (selectedLatitude == null || selectedLongitude == null || !kakaoMap || !wrapper) return;

    function centerSelectedBooth() {
      if (!wrapper || !kakaoMap) return;
      const bounds = wrapper.getBoundingClientRect();
      const list = boothListRef.current?.getBoundingClientRect();
      const tools = mapToolsRef.current?.getBoundingClientRect();
      const topBar = topActionBarRef.current?.getBoundingClientRect();
      // 메뉴가 덮고 있는 부분을 제외한 지도 영역의 가운데에 선택한 핀을 둔다.
      const left = list?.width ? Math.max(0, list.right - bounds.left) : 0;
      /*
        좁은 화면에서는 버튼 줄이 지도 폭을 다 쓰므로 «버튼 줄 왼쪽»을 오른쪽 경계로
        삼으면 남는 폭이 0이 된다. 그럴 땐 가로로는 비켜설 자리가 없으니 지도 전체를
        쓴다(세로로 내려서 피한다).
      */
      const toolsLeft = tools?.width ? tools.left - bounds.left : bounds.width;
      const right = toolsLeft > left ? Math.min(bounds.width, toolsLeft) : bounds.width;
      const targetX = (left + right) / 2;
      /*
        말풍선이 대상 위쪽에 뜨므로, 화면이 낮으면 세로 가운데에 둬도
        상단 버튼 줄 밑으로 파고든다. 버튼 줄 아래에 말풍선이 들어갈 만큼은 내린다.
        버튼 줄은 좁은 화면에서 두 줄로 접히므로 높이를 실제로 재서 쓴다 — 상수로 두면
        접힌 만큼 말풍선이 버튼 아래로 파고들어 이름 입력칸이 가려진다.

        재는 대상은 «위쪽» 버튼 줄이다. mapToolsRef는 오른쪽 «아래» 도구 열이라, 그쪽
        bottom을 쓰면 지도 높이만큼 더 내려보내 핀과 말풍선이 화면 밖으로 나간다.
      */
      // 대기줄·모양 편집 영역이 붙으면서 말풍선이 약 350px까지 길어졌다.
      const popoverRoom = 380;
      const topBarBottom = topBar ? Math.max(0, topBar.bottom - bounds.top) : 96;
      const targetY = Math.max(bounds.height / 2, topBarBottom + popoverRoom);
      const projection = kakaoMap.getProjection();
      const point = projection.containerPointFromCoords(
        new window.kakao.maps.LatLng(selectedLatitude!, selectedLongitude!),
      );
      kakaoMap.panTo(
        projection.coordsFromContainerPoint(
          new window.kakao.maps.Point(
            point.x + bounds.width / 2 - targetX,
            point.y + bounds.height / 2 - targetY,
          ),
        ),
      );
    }

    centerSelectedBooth();
    const observer = new ResizeObserver(centerSelectedBooth);
    observer.observe(wrapper);
    if (boothListRef.current) observer.observe(boothListRef.current);
    // 버튼 줄이 좁은 화면에서 접히면 높이가 달라지므로 같이 지켜본다.
    if (topActionBarRef.current) observer.observe(topActionBarRef.current);
    return () => observer.disconnect();
  }, [selectedId, selectedShapeId, selectedLatitude, selectedLongitude, kakaoMap, boothListOpen]);

  // 서버 데이터를 새로 받을 때마다(최초 진입, AI 분석 완료 등) 부스 전체가 보이도록
  // 한 번 맞춘다. 그 뒤로는 사용자가 옮기고 확대한 위치를 존중한다.
  const [fittedKey, setFittedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!seededKey || fittedKey === seededKey || mapLoading) return;
    if (fitBoothBounds(kakaoMapRef.current, booths)) setFittedKey(seededKey);
  }, [fittedKey, seededKey, mapLoading, booths]);
  const checkedBooths = useMemo(
    () => booths.filter((booth) => checkedIds.has(booth.id)),
    [booths, checkedIds],
  );
  const checkedShapes = useMemo(
    () => shapes.filter((shape) => checkedIds.has(shape.id)),
    [shapes, checkedIds],
  );
  /* 서버는 구역 멤버로 부스만 받는다. 화장실·입구가 섞이면 저장 전체가 거부된다. */
  const groupableBooths = useMemo(
    () => checkedBooths.filter((booth) => booth.nodeType === "BOOTH"),
    [checkedBooths],
  );
  /** 「구역에 넣기」에 띄울 목록. 묶어 둔 구역과 폴리곤으로 그린 구역을 함께 보여 준다. */
  const zoneOptions = useMemo(
    () => [
      ...standaloneZones.map((zone) => ({ id: zone.id, name: zone.name, drawn: false })),
      ...polygonShapes.map((shape) => ({ id: shape.id, name: shape.name, drawn: true })),
    ],
    [standaloneZones, polygonShapes],
  );
  const checkedInAnyZone = useMemo(
    () =>
      checkedBooths.some(
        (booth) => zoneIdByBoothId.has(booth.id) || shapeIdByBoothId.has(booth.id),
      ),
    [checkedBooths, zoneIdByBoothId, shapeIdByBoothId],
  );
  const pendingGroupMembers = useMemo(
    () => (groupPopoverOpen ? booths.filter((booth) => checkedIds.has(booth.id)) : []),
    [booths, checkedIds, groupPopoverOpen],
  );
  const mapCenter = editorQuery.data?.center ?? mapQuery.data?.center ?? festivalCenter;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!mapQuery.data?.mapId) {
        throw new Error("지도 정보를 불러오지 못했습니다.");
      }
      /*
        부스를 전부 지운 경우에도 삭제 내역은 서버에 보내야 하므로, 지울 노드가 있으면
        통과시킨다. 노드가 하나도 없어도 경계·팜플렛만 저장할 수 있다 — 서버가 표시
        설정만 담긴 요청을 받아 준다. 다만 둘 다 없으면 저장할 것이 없다.
      */
      const nodes = boothMapPinsToNodeChanges(booths, deletedNodeIds, shapes, preservedNodes);
      if (nodes.length === 0 && !siteBoundary && !pamphlet) {
        throw new Error("저장할 부스나 경계·팜플렛이 없습니다.");
      }
      if (siteBoundary) {
        const error = validateBoundary(siteBoundary);
        if (error) throw new Error(error);
      }
      let overlay = pamphlet;
      if (overlay && !cornersFromAnchor(overlay.anchor, overlay.imageWidth, overlay.imageHeight)) {
        throw new Error("팜플렛의 위치·폭·회전 값을 확인해 주세요.");
      }
      const file = overlay?.localObjectUrl
        ? localImageFiles.current.get(overlay.localObjectUrl)
        : undefined;
      if (file && overlay && !overlay.assetId) {
        const latest = await getMapEditor(festivalId, mapQuery.data.mapId);
        if (latest.editRevision !== editRevision)
          throw new Error(
            "다른 곳에서 수정되어 이미지 업로드를 중단했습니다. 초안을 보관한 뒤 최신본을 확인해 주세요.",
          );
        const uploaded = await uploadMapOverlay(festivalId, mapQuery.data.mapId, file);
        overlay = { ...overlay, ...uploaded, imageUrl: uploaded.imageUrl ?? overlay.imageUrl };
        setPamphlet(overlay);
        setPamphletFileNames((names) => ({ ...names, [uploaded.assetId]: file.name }));
        uploadedPamphletName.current = file.name;
      }
      return saveMapEditor(festivalId, mapQuery.data.mapId, {
        baseRevision: editRevision,
        presentation: {
          ...(siteBoundary
            ? { boundary: { geometryType: "POLYGON", schemaVersion: "2.0", points: siteBoundary } }
            : { clearBoundary: true }),
          /*
            팜플렛을 지운 채로 저장하면 서버에도 지워야 한다. 아무것도 안 보내면
            서버는 "변경 없음"으로 보고 기존 이미지를 그대로 들고 있어, 화면에서
            지웠는데 새로고침하면 되살아난다.
          */
          ...(overlay?.assetId
            ? {
                overlay: {
                  assetId: overlay.assetId,
                  ...overlay.anchor,
                  opacity: overlay.opacity,
                  visible: overlay.visible,
                  clipToBoundary: Boolean(siteBoundary && overlay.clipToBoundary),
                },
              }
            : serverHasOverlay
              ? { clearOverlay: true }
              : {}),
        },
        nodes,
        zones: buildZoneChanges({ zones, booths, polygonShapes, shapeIdByBoothId }),
      });
    },
    onSuccess: async (response) => {
      setEditRevision(response.editRevision);
      setDeletedNodeIds([]);
      /*
        지도만 저장하면 노드는 생겨도 운영 부스가 없어 대시보드가 «부스 0개»로 보인다.
        저장한 부스를 곧바로 운영 부스로 승인해 혼잡도·대기열·리포트까지 이어지게 한다.
        승인이 실패해도 지도 저장 자체는 이미 끝났으므로 그 사실만 알리고 진행한다.
      */
      let approvedCount = 0;
      try {
        const approved = await approveBooths(festivalId, mapQuery.data!.mapId);
        approvedCount = approved.approvedCount;
        if (approvedCount > 0) {
          await queryClient.invalidateQueries({ queryKey: ["festival-dashboard", festivalId] });
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, "부스를 운영 목록에 등록하지 못했습니다."), {
          description: "지도는 저장됐습니다. 잠시 후 다시 저장해 주세요.",
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      const editor = await getMapEditor(festivalId, mapQuery.data!.mapId);
      applyPartitionedNodes(editor.nodes, setBooths, setShapes, setPreservedNodes);
      setSiteBoundary(presentationBoundary(editor.presentation));
      setPamphlet(presentationOverlay(editor.presentation));
      setZones(
        (editor.zones ?? []).map((zone) => ({
          id: zone.zoneId,
          name: zone.name,
          boothIds: zone.boothNodeIds
            .map((nodeId) =>
              editor.nodes.find((node) => node.nodeId === nodeId) ? `node-${nodeId}` : null,
            )
            .filter((id): id is string => id !== null),
        })),
      );
      // 저장된 상태를 새 기준으로 삼는다(다음 렌더에서 현재 스냅샷으로 다시 채워진다).
      setSavedSnapshot(null);
      // 저장 직후 화면 상태를 "저장된 상태"로 다시 기준 잡는다.
      setSeedToken((token) => token + 1);
      // 저장해도 공개는 그대로 유지된다(서버가 공개본을 방금 저장한 판으로 따라오게 한다).
      const uploadedName = uploadedPamphletName.current;
      uploadedPamphletName.current = null;
      toast.success("부스맵과 표시 설정이 저장되었습니다.", {
        description:
          [
            uploadedName ? `팜플렛 ${uploadedName} 업로드를 완료했습니다.` : null,
            approvedCount > 0 ? `부스 ${approvedCount}개를 운영 목록에 등록했습니다.` : null,
          ]
            .filter(Boolean)
            .join(" ") || undefined,
      });
    },
    onError: async (error) => {
      uploadedPamphletName.current = null;
      if (getApiErrorCode(error) === 40910) {
        toast.error("다른 곳에서 수정되었습니다.", {
          description:
            "작성 중인 초안은 유지했습니다. 내용을 별도로 보관한 뒤 페이지를 새로고침해 최신본과 비교해 주세요.",
        });
        return;
      }
      toast.error(getApiErrorMessage(error, "부스맵 저장에 실패했습니다."));
    },
  });
  const replaceMutation = useMutation({
    mutationFn: (file: File) => {
      if (!mapQuery.data?.mapId) throw new Error("지도 정보를 불러오지 못했습니다.");
      return replaceFestivalMap(festivalId, mapQuery.data.mapId, file);
    },
    onSuccess: async (summary) => {
      // 지도가 통째로 교체됐으므로 편집기 쿼리 키에 쓰이는 mapId를 먼저 바꿔야 한다.
      // 옛 mapId로 편집기를 다시 부르면 로드맵의 현재 지도와 어긋나 409가 난다.
      queryClient.setQueryData(
        ["coordinate-map", festivalId],
        (previous: CreateCoordinateMapResponse | undefined) =>
          previous ? { ...previous, mapId: summary.mapId } : previous,
      );
      await queryClient.invalidateQueries({ queryKey: ["coordinate-map", festivalId] });
      await queryClient.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      await queryClient.invalidateQueries({ queryKey: ["map-analysis", festivalId] });
      toast.success("배치도를 올렸습니다.", {
        description: "AI가 부스를 찾는 동안 편집과 저장은 잠시 막힙니다.",
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "배치도 업로드에 실패했습니다.")),
  });

  /*
    저장만으로는 방문객에게 아무것도 보이지 않는다. 사용자 앱은 로드맵이 공개 상태일 때만
    부스·구역·경계·팜플렛을 받아 가므로, 공개를 눌러야 비로소 부스지도 탭이 채워진다.
  */
  const publishMutation = useMutation({
    mutationFn: () => {
      if (!mapQuery.data?.mapId) throw new Error("지도 정보를 불러오지 못했습니다.");
      return publishBoothMap(festivalId, mapQuery.data.mapId);
    },
    onSuccess: async (published) => {
      await queryClient.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      toast.success("부스맵을 방문객에게 공개했습니다.", {
        description: `방문객 앱 부스지도에 부스 ${published.publishedBoothCount}개가 보입니다.`,
      });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "부스맵 공개에 실패했습니다."), {
        description:
          getApiErrorCode(error) === 40921
            ? "방문객에게 보일 부스가 없습니다. 부스를 찍어 저장한 뒤 다시 시도해 주세요."
            : undefined,
      }),
  });

  /*
    잘못 그린 채 공개했을 때 내릴 방법이 없으면 부스를 전부 지우는 수밖에 없다. 서버는
    로드맵을 편집 상태로 되돌리기만 하므로 그려 둔 내용은 그대로 남는다.
  */
  const unpublishMutation = useMutation({
    mutationFn: () => {
      if (!mapQuery.data?.mapId) throw new Error("지도 정보를 불러오지 못했습니다.");
      return unpublishBoothMap(festivalId, mapQuery.data.mapId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      toast.success("부스맵 공개를 해제했습니다.", {
        description: "방문객 앱 부스지도에서 더 이상 보이지 않습니다. 그려 둔 내용은 그대로입니다.",
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "부스맵 공개 해제에 실패했습니다.")),
  });

  /*
    분석이 끝나면 서버가 새로 저장한 AI 노드를 받아 화면 상태를 다시 채우고, 결과는
    우측 상단 알림으로 알린다. 지도 위 카드는 진행 중일 때만 남는다.
  */
  const handleAnalysisCompleted = useCallback(
    async (status: MapAnalysisStatusResponse) => {
      await queryClient.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      setSeedToken((token) => token + 1);
      if (status.acceptedCount > 0) {
        toast.success(`부스 후보 ${status.acceptedCount}개를 찾았습니다.`, {
          description:
            status.rejectedCount > 0
              ? `읽지 못한 ${status.rejectedCount}개는 제외했습니다. 위치와 이름을 확인해 주세요.`
              : "위치와 이름을 확인한 뒤 저장해 주세요.",
        });
        return;
      }
      toast.info("배치도에서 부스를 찾지 못했습니다.", {
        description: "핀 도구로 직접 찍거나, 더 선명한 배치도로 다시 시도해 주세요.",
      });
    },
    [festivalId, queryClient],
  );

  const analysis = useMapAnalysis({
    festivalId,
    mapId: mapQuery.data?.mapId,
    onCompleted: handleAnalysisCompleted,
  });
  // 분석 중에는 백엔드가 저장을 거부한다. 화면에서 막지 않으면 의미 없는 409만 돌아온다.
  const analyzing = analysis.isRunning || editorQuery.data?.roadmapStatus === "ANALYZING";
  /** 지금 떠 있는 분석 안내를 가리키는 키. 작업이나 상태가 바뀌면 값도 바뀐다. */
  const analysisNoticeKey = analysis.status
    ? `${analysis.status.jobId}:${analysis.status.status}:${analysis.isTimedOut}`
    : null;
  /*
    종료된 축제의 부스 배치는 결과리포트의 근거 자료라 뒤늦게 바뀌면 안 된다.
    축제관리의 진입 버튼만 숨기면 주소를 직접 입력해 편집하고 저장까지 할 수 있어,
    편집기 자체를 분석 중과 같은 방식으로 잠근다. 보기는 막지 않는다 —
    지난 축제의 배치를 확인하는 것은 정당한 사용이다.
  */
  const isCompleted = festivalQuery.data?.progressStatus === "COMPLETED";
  const editingLocked = analyzing || isCompleted;
  const editLockReason = isCompleted
    ? "종료된 축제의 부스맵은 수정할 수 없습니다."
    : analyzing
      ? "AI 분석이 끝난 뒤에 편집할 수 있습니다."
      : null;
  const saveLockReason = isCompleted
    ? "종료된 축제의 부스맵은 저장할 수 없습니다."
    : analyzing
      ? "AI 분석이 끝난 뒤에 저장할 수 있습니다."
      : undefined;
  const hasBlueprintImage = !!editorQuery.data?.displayImageUrl;
  const reviewRequiredCount = booths.filter((booth) => booth.uncertain).length;

  // 편집기 데이터가 도착하면 로컬 상태를 채운다(렌더 중 조정 — effect가 아니다).
  // 같은 지도·같은 seedToken에서는 한 번만 채워 사용자의 편집을 덮어쓰지 않는다.
  const seedKey = editorQuery.data ? `${editorQuery.data.mapId}:${seedToken}` : null;
  if (editorQuery.data && seedKey !== null && seedKey !== seededKey) {
    applyPartitionedNodes(editorQuery.data.nodes, setBooths, setShapes, setPreservedNodes);
    setSiteBoundary(presentationBoundary(editorQuery.data.presentation));
    setPamphlet(presentationOverlay(editorQuery.data.presentation));
    setDraftPoints([]);
    setBoundaryDraft([]);
    setQueueDraft([]);
    setSelectedShapeId(null);
    setEditRevision(editorQuery.data.editRevision);
    setZones(
      (editorQuery.data.zones ?? []).map((zone) => ({
        id: zone.zoneId,
        name: zone.name,
        boothIds: zone.boothNodeIds.map((nodeId) => `node-${nodeId}`),
      })),
    );
    setDeletedNodeIds([]);
    setCheckedIds(new Set());
    setEditingBoothId(null);
    setSelectedZoneId(null);
    setSeededKey(seedKey);
  }

  // 저장하지 않은 편집이 있는지. 브라우저 뒤로가기·탭 닫기로 작업이 사라지는 것을 막는 데 쓴다.
  const currentSnapshot = useMemo(
    () => JSON.stringify({ booths, shapes, zones, deletedNodeIds, siteBoundary, pamphlet }),
    [booths, shapes, zones, deletedNodeIds, siteBoundary, pamphlet],
  );
  // 서버 데이터를 새로 채울 때마다(지도 교체·AI 분석 완료) 기준 스냅샷도 다시 잡는다.
  // 그러지 않으면 AI가 뿌린 부스가 곧바로 "저장하지 않은 편집"으로 잡힌다.
  const [savedSnapshot, setSavedSnapshot] = useState<{ key: string; value: string } | null>(null);
  if (seededKey !== null && savedSnapshot?.key !== seededKey) {
    setSavedSnapshot({ key: seededKey, value: currentSnapshot });
  }
  const hasUnsavedChanges = savedSnapshot !== null && savedSnapshot.value !== currentSnapshot;

  /** 팜플렛이 서버에 올라갔는지. 저장 버튼 하나로 업로드와 배치 저장이 같이 일어나 구분해 보여 준다. */
  const serverOverlay = editorQuery.data?.presentation?.overlay;
  const pamphletStatus: PamphletUploadStatus | null = !pamphlet
    ? null
    : saveMutation.isPending && pamphlet.assetId !== serverOverlay?.assetId
      ? "uploading"
      : !pamphlet.assetId
        ? saveMutation.isError
          ? "failed"
          : "pending"
        : pamphlet.assetId !== serverOverlay?.assetId
          ? "uploaded-unsaved"
          : JSON.stringify([
                pamphlet.anchor,
                pamphlet.opacity,
                pamphlet.visible,
                pamphlet.clipToBoundary,
              ]) !==
              JSON.stringify([
                serverOverlay.anchor,
                serverOverlay.opacity,
                serverOverlay.visible,
                serverOverlay.clipToBoundary,
              ])
            ? "saved-modified"
            : "saved";
  const pamphletFileName = pamphlet
    ? (pamphletFileNames[pamphlet.assetId ?? ""] ??
      pamphletFileNames[pamphlet.localObjectUrl ?? ""])
    : undefined;

  /*
    방문객 공개 상태. 저장해도 공개는 유지되고, 공개와 해제는 관리자가 버튼으로 직접 정한다.
    공개는 서버에 저장된 내용을 기준으로 하니, 저장하지 않은 편집이 남아 있으면 공개를 막는다.
    반대로 해제는 이미 공개된 것을 내리는 일이라 이 조건들이 필요 없다.
  */
  const isPublished = editorQuery.data?.roadmapStatus === "PUBLISHED";
  const publishLockReason = isCompleted
    ? "종료된 축제의 부스맵은 공개할 수 없습니다."
    : analyzing
      ? "AI 분석이 끝난 뒤에 공개할 수 있습니다."
      : hasUnsavedChanges
        ? "저장하지 않은 편집이 있습니다. 먼저 저장해 주세요."
        : booths.length === 0
          ? "방문객에게 보일 부스가 없습니다. 부스를 찍어 저장해 주세요."
          : null;

  // 실행취소/다시실행으로 되돌아온 스냅샷을 화면 상태에 다시 적용한다.
  // 여기서 복원한 결과는 currentSnapshot과 글자까지 같아지므로 히스토리에 다시 쌓이지 않는다.
  const restoreSnapshot = useCallback((value: string) => {
    const restored = JSON.parse(value) as {
      booths: LocalBoothPin[];
      shapes?: LocalMapShape[];
      zones: LocalZone[];
      deletedNodeIds: string[];
      siteBoundary?: LatLng[] | null;
      pamphlet?: LocalPamphletOverlay | null;
    };
    setBooths(restored.booths);
    setShapes(restored.shapes ?? []);
    setZones(restored.zones);
    setDeletedNodeIds(restored.deletedNodeIds);
    setSiteBoundary(restored.siteBoundary ?? null);
    setPamphlet(restored.pamphlet ?? null);
    setDraftPoints([]);
    setSelectedShapeId(null);
    // 되돌린 결과에 없는 부스를 가리키고 있을 수 있어 선택 상태는 비운다.
    setCheckedIds(new Set());
    setEditingBoothId(null);
    setSelectedZoneId(null);
    setGroupPopoverOpen(false);
  }, []);
  const { canUndo, canRedo, undo, redo } = useEditHistory({
    baselineKey: seededKey,
    snapshot: currentSnapshot,
    onRestore: restoreSnapshot,
  });
  const undoDisabled = !canUndo || editingLocked;
  const redoDisabled = !canRedo || editingLocked;

  // Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z 단축키.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLowerCase() !== "z") return;
      // 이름 입력 중에는 브라우저 기본 실행취소(글자 되돌리기)를 그대로 둔다.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }
      if (event.shiftKey) {
        if (redoDisabled) return;
        event.preventDefault();
        redo();
        return;
      }
      if (undoDisabled) return;
      event.preventDefault();
      undo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, undoDisabled, redoDisabled]);

  // 그리는 중 단축키 — Enter로 확정, Esc로 그만두기, Backspace로 한 점 무르기.
  useEffect(() => {
    if (drawTool !== "polygon" && drawTool !== "line") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key === "Enter") {
        event.preventDefault();
        finishDraftShape();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelDraftShape();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        undoDraftPoint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // 그리기 상태(draftPoints)가 바뀔 때마다 최신 값을 보도록 다시 건다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawTool, draftPoints]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  function addBoothAt(lat: number, lng: number) {
    /*
      화면설계서 4-6은 상위구역을 고른 뒤 그 구역 폴리곤 안에 부스를 찍게 한다.
      밖에 찍었다고 막지는 않되(지도를 옮겨 가며 찍는 흐름을 끊는다), 어느 구역에도
      들어가지 않았다는 것은 알려 준다.
    */
    if (selectedShape?.kind === "polygon" && !containsPoint(selectedShape.points, { lat, lng })) {
      toast.info(`${selectedShape.name} 밖에 찍었습니다.`, {
        description: "구역 안에 찍으면 그 구역의 부스로 묶입니다.",
      });
    }
    const id = crypto.randomUUID();
    setBooths((prev) => [
      ...prev,
      {
        id,
        nodeId: null,
        nodeType: pendingPinType,
        name: `${NODE_TYPE_LABEL[pendingPinType] ?? "시설"}명 ${prev.length + 1}`,
        lat,
        lng,
        isNew: true,
      },
    ]);
    if (selectedZoneId) {
      setZones((prev) =>
        prev.map((zone) =>
          zone.id === selectedZoneId ? { ...zone, boothIds: [...zone.boothIds, id] } : zone,
        ),
      );
    }
    setCheckedIds(new Set([id]));
    setEditingBoothId(id);
    setDrawTool("select");
    setPinTypeMenuOpen(false);
  }

  /** 폴리곤·라인 그리기를 시작한다. 같은 버튼을 다시 누르면 그리기를 접는다. */
  function startShapeTool(kind: "polygon" | "line") {
    setPinTypeMenuOpen(false);
    setSelectedShapeId(null);
    setEditingBoothId(null);
    setDraftPoints([]);
    setDrawTool((current) => (current === kind ? "select" : kind));
  }

  /** 그리는 중인 도형에 꼭짓점을 하나 더한다. */
  function addDraftPoint(lat: number, lng: number) {
    setDraftPoints((prev) => [...prev, { lat, lng }]);
  }

  /** 찍어 둔 꼭짓점으로 도형을 확정한다. 최소 점수를 못 채우면 아무 일도 하지 않는다. */
  function finishDraftShape() {
    if (drawTool !== "polygon" && drawTool !== "line") return;
    const kind = drawTool;
    if (draftPoints.length < SHAPE_MINIMUM_POINTS[kind]) return;
    const id = crypto.randomUUID();
    setShapes((prev) => [
      ...prev,
      {
        id,
        nodeId: null,
        name: `${SHAPE_LABEL[kind]}명 ${prev.filter((shape) => shape.kind === kind).length + 1}`,
        nodeType: SHAPE_NODE_TYPE[kind],
        kind,
        points: draftPoints,
        isNew: true,
      },
    ]);
    setDraftPoints([]);
    setDrawTool("select");
    setEditingBoothId(null);
    // 앞서 고른 구역을 그대로 두면 새 도형과 말풍선이 겹쳐 뜬다.
    setSelectedZoneId(null);
    setSelectedShapeId(id);
  }

  function cancelDraftShape() {
    setDraftPoints([]);
    setDrawTool("select");
  }

  /** 마지막으로 찍은 꼭짓점 하나를 무른다. 그리는 중에는 실행취소 기록에 남기지 않는다. */
  function undoDraftPoint() {
    setDraftPoints((prev) => prev.slice(0, -1));
  }

  function deleteShape(shapeId: string) {
    const target = shapes.find((shape) => shape.id === shapeId);
    if (target?.nodeId) {
      setDeletedNodeIds((prev) => [...prev, target.nodeId!]);
    }
    setShapes((prev) => prev.filter((shape) => shape.id !== shapeId));
    setSelectedShapeId(null);
  }

  /*
    Enter 단축키가 이 함수를 키보드 effect 안에서 부른다. 일반 함수로 두면 effect가
    다시 걸리지 않는 동안 boundaryDraft가 시작값(빈 배열)에 묶여, 꼭짓점을 찍어 놓고
    Enter를 눌러도 "점이 부족하다"며 완료되지 않는다. draft를 의존성으로 묶어 둔다.
  */
  const finishBoundary = useCallback(() => {
    const error = validateBoundary(boundaryDraft);
    if (error) {
      toast.error(error);
      return;
    }
    setSiteBoundary(uniqueVertices(withoutClosingDuplicate(boundaryDraft)));
    setBoundaryDraft([]);
    setDrawTool("select");
  }, [boundaryDraft]);

  function loadOverlayFile(file: File) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      localImageFiles.current.set(url, file);
      setPamphletFileNames((names) => ({ ...names, [url]: file.name }));
      const center = kakaoMapRef.current?.getCenter();
      const centerLatitude = center?.getLat() ?? mapCenter?.lat ?? 37.5;
      const centerLongitude = center?.getLng() ?? mapCenter?.lng ?? 127;
      const anchor = {
        centerLatitude,
        centerLongitude,
        groundWidthMeters: 80,
        rotationDegrees: 0,
      };
      const corners = cornersFromAnchor(anchor, image.width, image.height);
      if (!corners) {
        URL.revokeObjectURL(url);
        toast.error("팜플렛 이미지를 배치할 수 없습니다.");
        return;
      }
      setPamphlet({
        imageUrl: url,
        imageWidth: image.width,
        imageHeight: image.height,
        anchor,
        corners,
        opacity: 0.7,
        visible: true,
        clipToBoundary: Boolean(siteBoundary),
        localObjectUrl: url,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error("팜플렛 이미지를 읽지 못했습니다.");
    };
    image.src = url;
  }

  function updatePamphletAnchor(
    patch: Partial<LocalPamphletOverlay["anchor"]> &
      Partial<Pick<LocalPamphletOverlay, "opacity" | "visible" | "clipToBoundary">>,
  ) {
    setPamphlet((prev) => {
      if (!prev) return prev;
      const anchor = {
        centerLatitude: patch.centerLatitude ?? prev.anchor.centerLatitude,
        centerLongitude: patch.centerLongitude ?? prev.anchor.centerLongitude,
        groundWidthMeters: patch.groundWidthMeters ?? prev.anchor.groundWidthMeters,
        rotationDegrees: patch.rotationDegrees ?? prev.anchor.rotationDegrees,
      };
      const corners = cornersFromAnchor(anchor, prev.imageWidth, prev.imageHeight) ?? prev.corners;
      return {
        ...prev,
        ...patch,
        anchor,
        corners,
        clipToBoundary: patch.clipToBoundary ?? prev.clipToBoundary,
      };
    });
  }

  const relatedBoothIdByPinId = useMemo(() => {
    const map = new Map<string, number>();
    booths.forEach((booth) => {
      if (booth.relatedBoothId) {
        map.set(booth.id, booth.relatedBoothId);
        return;
      }
      const dashboardBooth = dashboardQuery.data?.booths.find(
        (item) => item.roadmapNodePublicId === booth.nodeId,
      );
      if (dashboardBooth) map.set(booth.id, dashboardBooth.boothId);
    });
    return map;
  }, [booths, dashboardQuery.data?.booths]);
  const queueByBoothId = useMemo(() => {
    const map = new Map<string, FestivalQueue>();
    (queuesQuery.data?.queues ?? []).forEach((queue) => map.set(String(queue.boothId), queue));
    return map;
  }, [queuesQuery.data?.queues]);
  const selectedOpsBoothId =
    selectedBooth && relatedBoothIdByPinId.has(selectedBooth.id)
      ? relatedBoothIdByPinId.get(selectedBooth.id)!
      : null;
  const selectedQueue =
    selectedOpsBoothId != null ? queueByBoothId.get(String(selectedOpsBoothId)) : undefined;
  const activeQueueEditor = useRef({
    queueId: queueDraftId,
    mode: queueMode,
    boothId: selectedOpsBoothId,
  });
  useEffect(() => {
    activeQueueEditor.current = {
      queueId: queueDraftId,
      mode: queueMode,
      boothId: selectedOpsBoothId,
    };
  }, [queueDraftId, queueMode, selectedOpsBoothId]);
  const canPlanQueue = selectedOpsBoothId != null && selectedBooth?.nodeType === "BOOTH";
  const canEditQueue = Boolean(selectedQueue && canPlanQueue);
  const selectedPlanQuery = useQuery({
    queryKey: ["booth-queue-plan", festivalId, selectedOpsBoothId],
    queryFn: () => getQueuePlan(festivalId, selectedOpsBoothId!),
    enabled: canPlanQueue,
    retry: false,
  });
  /*
    「승인된 부스만…」이라고만 적어 두면 무엇을 해야 켜지는지 알 수 없다. 대기줄은 저장된
    부스에 운영 대기열이 만들어진 뒤에야 그릴 수 있으므로 단계별로 알려 준다.
  */
  const queueToolDisabledReason = !selectedBooth
    ? "부스를 먼저 선택해 주세요."
    : selectedBooth.nodeType !== "BOOTH"
      ? "부스 핀에만 대기줄을 그릴 수 있습니다."
      : "저장한 뒤 대기열이 만들어진 부스에만 그릴 수 있습니다.";
  const planDisabledReason =
    !selectedBooth || selectedBooth.nodeType !== "BOOTH"
      ? queueToolDisabledReason
      : editingLocked
        ? "현재 축제 또는 지도 상태에서는 줄을 설정할 수 없습니다."
        : queuePlanBusy
          ? "진행 중인 줄 설정 작업을 먼저 완료해 주세요."
          : festivalQuery.data?.role !== "FESTIVAL_OWNER"
            ? "사전 줄 설정은 축제 총괄 계정에서 가능합니다."
            : hasUnsavedChanges
              ? "지도 변경을 먼저 저장해 주세요."
              : !canPlanQueue
                ? "부스를 지도에 저장하고 운영 부스로 승인해 주세요."
                : undefined;
  const currentDisabledReason =
    !selectedPlanQuery.data || selectedPlanQuery.data.path.length < 2
      ? "사전 줄 경로를 먼저 설정해 주세요."
      : editingLocked || queuePlanBusy
        ? "진행 중인 작업 또는 지도 상태를 확인해 주세요."
        : !canEditQueue
          ? queuesQuery.isError
            ? "현재 대기열 조회에 실패했습니다. 화면을 새로고침해 주세요."
            : "현재 대기열을 불러오거나 운영 부스 승인을 완료해 주세요."
          : undefined;
  function openQueuePlan() {
    if (planDisabledReason || !selectedBooth) return;
    setQueueMode("plan");
    setDrawTool("queue-line");
    setPinTypeMenuOpen(false);
    setDraftPoints([]);
    setQueueDraft(
      selectedPlanQuery.data && selectedPlanQuery.data.path.length >= 2
        ? selectedPlanQuery.data.path
        : [{ lat: selectedBooth.lat, lng: selectedBooth.lng }],
    );
    setQueueDraftId(selectedQueue?.queueId ?? null);
  }
  function openCurrentQueue() {
    if (currentDisabledReason) return;
    setQueueMode("current");
    setQueueTailOnly(true);
    setQueueDraftRevision(selectedQueue?.observationRevision);
    setDrawTool("queue-line");
    setPinTypeMenuOpen(false);
    setDraftPoints([]);
    const tail = selectedQueue?.path?.at(-1);
    setQueueDraft(
      tail && selectedPlanQuery.data ? [snapToQueuePath(selectedPlanQuery.data.path, tail)] : [],
    );
    setQueueDraftId(selectedQueue?.queueId ?? null);
  }
  const boothQueueActions =
    selectedBooth?.nodeType === "BOOTH" ? (
      <BoothQueueActions
        boothName={selectedBooth.name}
        planExists={Boolean(selectedPlanQuery.data && selectedPlanQuery.data.path.length >= 2)}
        planSummary={
          selectedPlanQuery.data && selectedPlanQuery.data.path.length >= 2
            ? `사전 줄 ${Math.round(selectedPlanQuery.data.lengthMeters)}m · 약 ${selectedPlanQuery.data.estimatedCapacity}명`
            : undefined
        }
        waitMinutes={selectedQueue?.waitMinutes}
        currentExists={Boolean(selectedQueue?.path && selectedQueue.path.length >= 2)}
        planDisabledReason={planDisabledReason}
        currentDisabledReason={currentDisabledReason}
        onPlan={openQueuePlan}
        onCurrent={openCurrentQueue}
      />
    ) : null;
  const panOverride = spaceHeld || modifierHeld;
  /*
    하단 선택 바가 떠 있는지. 지도 위 다른 하단 요소를 그만큼 띄우는 데 쓴다.

    하나만 골랐을 때는 띄우지 않는다. 그때는 이미 그 대상의 말풍선이 떠 있어 할 일이
    거기 다 있고, 바를 함께 띄우면 화면 아래쪽에 있는 말풍선의 대기줄 버튼을 덮는다.
  */
  const selectionBarOpen = drawTool === "select" && !editingLocked && checkedIds.size >= 2;
  const queuePathItems = useMemo(() => {
    const items = boothsToQueuePathItems(
      booths
        .filter((booth) => relatedBoothIdByPinId.has(booth.id))
        .map((booth) => {
          const opsId = relatedBoothIdByPinId.get(booth.id)!;
          const dashboardBooth = dashboardQuery.data?.booths.find((item) => item.boothId === opsId);
          return {
            boothId: String(opsId),
            lat: booth.lat,
            lng: booth.lng,
            waitMinutes:
              queueByBoothId.get(String(opsId))?.waitMinutes ?? dashboardBooth?.waitMinutes ?? null,
          };
        }),
      queueByBoothId,
    );
    if (
      queueMode === "current" &&
      drawTool === "queue-line" &&
      queueDraft.length >= 2 &&
      queueDraft.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) &&
      queueDraftId
    ) {
      return items.map((item) =>
        item.queueId === queueDraftId ? { ...item, path: queueDraft } : item,
      );
    }
    return items;
  }, [
    booths,
    dashboardQuery.data?.booths,
    queueByBoothId,
    queueDraft,
    relatedBoothIdByPinId,
    queueDraftId,
    drawTool,
    queueMode,
  ]);
  const queueSaveMutation = useMutation({
    mutationFn: async (path: LatLng[]) => {
      if (!selectedPlanQuery.data || selectedPlanQuery.data.path.length < 2)
        throw new Error("사전 줄 경로를 먼저 설정해 주세요.");
      if (
        !path.every(
          (p) =>
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lng) &&
            Math.abs(p.lat) <= 90 &&
            Math.abs(p.lng) <= 180,
        )
      )
        throw new Error("올바른 위도·경도를 입력해 주세요.");
      if (!queueDraftId) throw new Error("승인된 부스 대기열이 없습니다.");
      if (queueMode !== "current" || selectedQueue?.queueId !== queueDraftId)
        throw new Error("선택한 부스가 바뀌었습니다. 대기줄 도구를 다시 열어 주세요.");
      /*
        빈 배열은 "경로 삭제"다(백엔드 BE-05: null=유지, []=삭제, 1점 거절).
        줄끝 좌표는 대기시간 계산에 쓰이므로 지우지 않고 지금 값을 그대로 다시 보낸다.
      */
      if (path.length === 0) {
        const tailLatitude = selectedQueue?.tailLatitude;
        const tailLongitude = selectedQueue?.tailLongitude;
        if (tailLatitude == null || tailLongitude == null) {
          throw new Error("줄끝 위치가 없어 경로만 지울 수 없습니다.");
        }
        return updateQueueTail(festivalId, queueDraftId, {
          tailLatitude,
          tailLongitude,
          path: [],
          expectedRevision: queueDraftRevision,
        });
      }
      if (queueTailOnly) {
        const tail = path[path.length - 1];
        return updateQueueTail(festivalId, queueDraftId, {
          tailLatitude: tail.lat,
          tailLongitude: tail.lng,
          expectedRevision: queueDraftRevision,
          planRevision: selectedPlanQuery.data?.revision,
        });
      }
      if (path.length < 2 || path.length > 500)
        throw new Error("대기줄은 2~500개의 점이 필요합니다.");
      const tail = path[path.length - 1];
      return updateQueueTail(festivalId, queueDraftId, {
        tailLatitude: tail.lat,
        tailLongitude: tail.lng,
        path,
        expectedRevision: queueDraftRevision,
      });
    },
    onSuccess: (result) => {
      if (
        activeQueueEditor.current.mode === "current" &&
        activeQueueEditor.current.queueId === result.queueId &&
        activeQueueEditor.current.boothId === result.boothId
      ) {
        setQueueSaveError(null);
        setQueueDraft([]);
        setQueueDraftId(null);
        setDrawTool("select");
      }
      queryClient.setQueryData<FestivalQueueList>(["festival-queues", festivalId], (previous) =>
        previous
          ? {
              ...previous,
              queues: previous.queues.map((queue) =>
                queue.queueId === result.queueId ? result : queue,
              ),
            }
          : previous,
      );
      void queryClient.invalidateQueries({ queryKey: ["festival-queues", festivalId] });
      void queryClient.invalidateQueries({ queryKey: ["festival-dashboard", festivalId] });
      toast.success("현재 대기줄과 자동 대기시간이 갱신되었습니다.");
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, "대기줄 저장에 실패했습니다.");
      setQueueSaveError(message);
      toast.error(message);
      void queryClient.invalidateQueries({ queryKey: ["festival-queues", festivalId] });
    },
  });

  /**
   * 지도에 그려 둔 라인 도형을 운영 대기줄 경로로 가져온다.
   *
   * 지도 노드(QUEUE·통로 등)와 운영 대기줄은 다른 데이터라 자동으로 옮기지 않는다.
   * 부스를 고르고 이 버튼을 눌러야만 초안으로 들어오고, 저장은 따로 눌러야 한다.
   */
  function importQueueDraftFrom(shape: LocalMapShape) {
    const points =
      queueMode === "current" && selectedPlanQuery.data
        ? [snapToQueuePath(selectedPlanQuery.data.path, shape.points.at(-1)!)]
        : shape.points;
    setQueueDraft(points.map((point) => ({ lat: point.lat, lng: point.lng })));
    setQueueImportOpen(false);
    toast.info(`${shape.name}을(를) 대기줄 초안으로 가져왔습니다.`, {
      description: "위치를 확인한 뒤 «대기줄 저장»을 눌러 주세요.",
    });
  }

  /** 끌고 있는 도형은 아직 shapes에 반영되지 않았으므로 임시 좌표를 대신 쓴다. */
  function shapePointsOf(shape: LocalMapShape) {
    if (moveDraft?.ids.has(shape.id)) return shiftPoints(shape.points, moveDraft.delta);
    if (draggingVertex?.shapeId !== shape.id) return shape.points;
    const moving = draggingVertex;
    return shape.points.map((point, index) =>
      index === moving.index ? { lat: moving.lat, lng: moving.lng } : point,
    );
  }

  /** 끌고 있는 핀은 아직 booths에 반영되지 않았으므로 임시 위치를 대신 쓴다. */
  function pinPositionOf(booth: LocalBoothPin) {
    const position = { lat: booth.lat, lng: booth.lng };
    return moveDraft?.ids.has(booth.id) ? shiftPoint(position, moveDraft.delta) : position;
  }

  /** 화면 좌표를 지도 좌표로. 지도나 래퍼가 아직 없으면 null. */
  function coordsAtClient(clientX: number, clientY: number): LatLng | null {
    const map = kakaoMapRef.current;
    const wrapper = mapWrapperRef.current;
    if (!map || !wrapper || !window.kakao?.maps) return null;
    const bounds = wrapper.getBoundingClientRect();
    const coords = map
      .getProjection()
      .coordsFromContainerPoint(
        new window.kakao.maps.Point(clientX - bounds.left, clientY - bounds.top),
      );
    return { lat: coords.getLat(), lng: coords.getLng() };
  }

  /** 지도 좌표를 지도 안 화면 좌표(px)로. 「커서가 이 도형을 짚었나」는 보이는 대로 판정한다. */
  function pixelOf(point: LatLng): Point2D | null {
    const map = kakaoMapRef.current;
    if (!map || !window.kakao?.maps) return null;
    const projected = map
      .getProjection()
      .containerPointFromCoords(new window.kakao.maps.LatLng(point.lat, point.lng));
    return { x: projected.x, y: projected.y };
  }

  /**
   * 하나를 끌면 무엇이 같이 움직이는지.
   *
   * 골라 둔 것 중 하나를 끌면 고른 것 전부가 함께 간다. 고르지 않은 것을 끌면 그것만 간다 —
   * 여러 개를 골라 둔 채 다른 하나를 손보려다 선택 전체가 끌려가는 일을 막는다.
   *
   * 구역 폴리곤이 끌려가면 그 안에 든 부스도 함께 간다. 부스의 구역 소속은 좌표로 판정하므로
   * (shapeIdByBoothId), 폴리곤만 옮기면 부스들이 제자리에 남아 소속이 통째로 끊긴다.
   */
  function moveTargetsOf(anchorId: string): Set<string> {
    const targets =
      checkedIds.has(anchorId) && checkedIds.size > 1 ? new Set(checkedIds) : new Set([anchorId]);
    polygonShapes.forEach((shape) => {
      if (!targets.has(shape.id)) return;
      booths.forEach((booth) => {
        if (shapeIdByBoothId.get(booth.id) === shape.id) targets.add(booth.id);
      });
    });
    // 묶어 둔 구역(폴리곤 없이 부스만 모은 그룹)은 멤버 부스가 곧 그 구역의 실체다.
    zones.forEach((zone) => {
      if (!targets.has(zone.id)) return;
      zone.boothIds.forEach((id) => targets.add(id));
    });
    return targets;
  }

  /** 끌어 옮긴 결과를 한 번에 반영한다. 되돌리기 한 번으로 원위치된다. */
  function applyMove(ids: Set<string>, delta: LatLngDelta) {
    if (!delta.dLat && !delta.dLng) return;
    setBooths((prev) =>
      prev.map((booth) =>
        ids.has(booth.id)
          ? { ...booth, ...shiftPoint({ lat: booth.lat, lng: booth.lng }, delta) }
          : booth,
      ),
    );
    setShapes((prev) =>
      prev.map((shape) =>
        ids.has(shape.id) ? { ...shape, points: shiftPoints(shape.points, delta) } : shape,
      ),
    );
  }

  /**
   * 고른 객체들을 지도 위에서 통째로 끈다.
   *
   * 카카오맵 CustomOverlay에는 마커 같은 draggable 옵션이 없어 포인터 이벤트로 직접 처리한다.
   * 끄는 동안 지도가 따라 움직이거나 확대되지 않도록 잠갔다가 손을 뗄 때 되돌린다 — 확대까지
   * 잠그는 이유는 좌표 변환 기준이 도중에 바뀌면 끌던 것이 커서에서 튀기 때문이다.
   */
  function startObjectDrag(
    ids: Set<string>,
    event: { clientX: number; clientY: number; button: number },
    origin?: LatLng,
  ) {
    // 핀 추가 모드에서는 지도 클릭이 곧 새 핀이라 이동을 받지 않는다.
    if (
      editingLocked ||
      panOverride ||
      queuePlanBusy ||
      drawTool !== "select" ||
      event.button !== 0 ||
      ids.size === 0
    )
      return;
    const map = kakaoMapRef.current;
    if (!map) return;
    const start = origin ?? coordsAtClient(event.clientX, event.clientY);
    if (!start) return;

    movedRef.current = false;
    movingRef.current = true;
    // 커서가 핀에 올라온 시점에 이미 잠갔지만, 터치처럼 hover 없이 바로 누르는 입력도 있다.
    map.setDraggable(false);
    map.setZoomable(false);

    const handleMove = (moveEvent: PointerEvent) => {
      // 클릭 중의 작은 손 떨림을 이동으로 저장하지 않는다.
      if (
        !movedRef.current &&
        Math.hypot(moveEvent.clientX - event.clientX, moveEvent.clientY - event.clientY) < 5
      )
        return;
      movedRef.current = true;
      const now = coordsAtClient(moveEvent.clientX, moveEvent.clientY);
      if (now) setMoveDraft({ ids, delta: deltaBetween(start, now) });
    };
    const handleUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      movingRef.current = false;
      // 손을 뗀 자리에 아직 핀이 있으면 잠금을 그대로 둔다 — 바로 다시 끌 수 있어야 한다.
      if (!pinHoveredRef.current) map.setDraggable(true);
      map.setZoomable(true);
      setMoveDraft(null);
      if (upEvent.type === "pointercancel") {
        movedRef.current = false;
        return;
      }
      // 움직이지 않았다면 그냥 클릭이다. 이어지는 click 핸들러가 선택을 맡는다.
      if (!movedRef.current) return;
      const end = coordsAtClient(upEvent.clientX, upEvent.clientY);
      if (end) applyMove(ids, deltaBetween(start, end));
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }

  /**
   * 지도의 이 화면 좌표에 걸리는 편집 대상. 위에 그려진 것부터 찾는다.
   *
   * 핀은 제 버튼이 포인터를 직접 받으므로 여기서는 도형과 구역만 본다. 선 도형은 두께가
   * 몇 px뿐이라 정확히 짚기 어려워 가까이만 가도 집히게 한다.
   */
  function hitObjectAt(clientX: number, clientY: number): string | null {
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return null;
    const bounds = wrapper.getBoundingClientRect();
    const at = { x: clientX - bounds.left, y: clientY - bounds.top };
    const toPixels = (points: LatLng[]) => {
      const pixels: Point2D[] = [];
      for (const point of points) {
        const pixel = pixelOf(point);
        if (!pixel) return null;
        pixels.push(pixel);
      }
      return pixels;
    };

    // 나중에 그린 것이 위에 있다. 뒤에서부터 본다.
    for (let index = shapes.length - 1; index >= 0; index -= 1) {
      const shape = shapes[index];
      const pixels = toPixels(shapePointsOf(shape));
      if (!pixels) continue;
      if (
        shape.kind === "polygon"
          ? pointInPolygonPx(pixels, at)
          : distanceToPolylinePx(pixels, at) <= 8
      ) {
        return shape.id;
      }
    }
    for (const zone of standaloneZones) {
      const members = booths.filter((booth) => zone.boothIds.includes(booth.id));
      if (members.length === 0) continue;
      const pixels = toPixels(zonePolygonPath(members));
      if (pixels && pointInPolygonPx(pixels, at)) return zone.id;
    }
    return null;
  }

  /**
   * 빈 지도를 끌어 사각 범위 안의 부스·도형을 한꺼번에 고른다.
   *
   * 지도 자체의 드래그는 «이동»이라 같은 제스처를 쓸 수 없다. Shift를 누른 채 끌 때만
   * 범위 선택으로 본다 — Shift+클릭이 이미 «선택에 더하기»라 같은 결을 잇는다.
   */
  function startMarquee(event: React.PointerEvent<HTMLDivElement>) {
    const map = kakaoMapRef.current;
    const start = coordsAtClient(event.clientX, event.clientY);
    if (!map || !start) return;

    const additive = checkedIds.size > 0;
    const before = new Set(checkedIds);
    movingRef.current = true;
    map.setDraggable(false);
    map.setZoomable(false);

    const handleMove = (moveEvent: PointerEvent) => {
      const now = coordsAtClient(moveEvent.clientX, moveEvent.clientY);
      if (now) setMarquee(boundsFromCorners(start, now));
    };
    const handleUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      movingRef.current = false;
      map.setDraggable(true);
      map.setZoomable(true);
      setMarquee(null);
      if (upEvent.type === "pointercancel") return;
      const end = coordsAtClient(upEvent.clientX, upEvent.clientY);
      if (!end) return;
      const box = boundsFromCorners(start, end);
      // 끌지 않고 누르기만 했으면 선택을 비운다 — 빈 곳을 누른 셈이다.
      if (isNegligibleBounds(box)) {
        setCheckedIds(new Set());
        setEditingBoothId(null);
        setSelectedShapeId(null);
        return;
      }
      const picked = new Set(additive ? before : []);
      visibleBooths.forEach((booth) => {
        if (boundsContainPoint(box, pinPositionOf(booth))) picked.add(booth.id);
      });
      shapes.forEach((shape) => {
        if (boundsTouchPoints(box, shapePointsOf(shape))) picked.add(shape.id);
      });
      setCheckedIds(picked);
      // 여러 개를 고른 뒤에는 개별 편집 말풍선이 자리를 가린다.
      setEditingBoothId(null);
      setSelectedShapeId(null);
      // 고르고 나면 선택 도구로 돌아간다 — 바로 끌어 옮길 수 있어야 한 동작으로 이어진다.
      setDrawTool("select");
      if (picked.size === 0) toast.info("범위 안에 고를 것이 없습니다.");
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }

  /**
   * 지도 바닥에서 시작한 포인터. 도형·구역을 끌거나, Shift면 범위 선택을 연다.
   *
   * 핀과 손잡이 버튼은 각자 포인터를 받으므로 여기까지 오지 않는다. 카카오가 mousedown을
   * 먼저 잡아 패닝을 시작하므로, 여기서 곧바로 지도 드래그를 잠가야 한 박자 늦지 않는다.
   */
  function handleMapPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || editingLocked || queuePlanBusy) return;
    if (drawTool !== "select" && drawTool !== "marquee") return;
    const target = event.target as HTMLElement | null;
    // 핀·도구 버튼 위에서 시작한 것은 그쪽 핸들러가 맡는다.
    if (target?.closest("button") || target?.closest("[data-map-tools]")) return;
    // 범위 선택 도구에서는 수정키 없이 바로 끌어 고른다. 고른 것을 옮기는 건 선택 도구에서.
    if (drawTool === "marquee" || event.shiftKey) {
      event.preventDefault();
      startMarquee(event);
      return;
    }
    // 스페이스·⌘을 누른 채로는 지도를 옮기는 중이다.
    if (panOverride) return;
    const hit = hitObjectAt(event.clientX, event.clientY);
    if (!hit) return;
    startObjectDrag(moveTargetsOf(hit), event);
  }

  function startQueuePointDrag(index: number, event: React.PointerEvent<HTMLElement>) {
    if (
      (index === 0 && queueMode === "plan") ||
      drawTool !== "queue-line" ||
      editingLocked ||
      hasUnsavedChanges ||
      queuePlanBusy ||
      queueSaveMutation.isPending ||
      (queueMode === "plan" && selectedPlanQuery.isPending) ||
      event.button !== 0
    )
      return;
    const map = kakaoMapRef.current;
    const wrapper = mapWrapperRef.current;
    if (!map || !wrapper || !window.kakao?.maps) return;
    event.preventDefault();
    event.stopPropagation();
    map.setDraggable(false);
    const original = queueDraft;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (pointEvent: PointerEvent) => {
      const bounds = wrapper.getBoundingClientRect();
      const point = map
        .getProjection()
        .coordsFromContainerPoint(
          new window.kakao.maps.Point(
            pointEvent.clientX - bounds.left,
            pointEvent.clientY - bounds.top,
          ),
        );
      setQueueDraft((points) =>
        points.map((p, i) =>
          i === index
            ? queueMode === "current" && selectedPlanQuery.data
              ? snapToQueuePath(selectedPlanQuery.data.path, {
                  lat: point.getLat(),
                  lng: point.getLng(),
                })
              : { lat: point.getLat(), lng: point.getLng() }
            : p,
        ),
      );
    };
    const finish = (pointEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (pointEvent.type === "pointercancel") setQueueDraft(original);
      map.setDraggable(true);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  /**
   * 도형 꼭짓점을 끌어 모양을 고친다.
   *
   * 예전에는 한 번 그린 도형의 모양을 바꿀 방법이 없어, 말풍선의 "수정"으로 할 수 있는
   * 일이 이름뿐이었다. 핀 드래그와 같은 방식(호버 시 지도 잠금 → 포인터 추적)을 쓴다.
   */
  function startVertexDrag(shape: LocalMapShape, index: number, event: React.PointerEvent) {
    if (editingLocked || drawTool !== "select" || event.button !== 0) return;
    const map = kakaoMapRef.current;
    const wrapper = mapWrapperRef.current;
    if (!map || !wrapper || !window.kakao?.maps) return;

    event.preventDefault();
    event.stopPropagation();
    vertexDraggingRef.current = true;
    map.setDraggable(false);
    const bounds = wrapper.getBoundingClientRect();

    const coordsAt = (clientX: number, clientY: number) =>
      map
        .getProjection()
        .coordsFromContainerPoint(
          new window.kakao.maps.Point(clientX - bounds.left, clientY - bounds.top),
        );

    const handleMove = (moveEvent: PointerEvent) => {
      const coords = coordsAt(moveEvent.clientX, moveEvent.clientY);
      setDraggingVertex({
        shapeId: shape.id,
        index,
        lat: coords.getLat(),
        lng: coords.getLng(),
      });
    };
    const handleUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      vertexDraggingRef.current = false;
      if (!vertexHoveredRef.current) map.setDraggable(true);
      setDraggingVertex(null);
      const coords = coordsAt(upEvent.clientX, upEvent.clientY);
      setShapes((prev) =>
        prev.map((item) =>
          item.id === shape.id
            ? {
                ...item,
                points: item.points.map((point, at) =>
                  at === index ? { lat: coords.getLat(), lng: coords.getLng() } : point,
                ),
              }
            : item,
        ),
      );
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }

  /** 고른 모양으로 꼭짓점을 다시 만든다. 위치와 대략의 크기는 유지한다. */
  function applyShapePreset(shape: LocalMapShape, preset: PolygonPreset) {
    setShapes((prev) =>
      prev.map((item) =>
        item.id === shape.id ? { ...item, points: presetPolygonPoints(item.points, preset) } : item,
      ),
    );
  }

  function straightenShape(shape: LocalMapShape) {
    setShapes((prev) =>
      prev.map((item) =>
        item.id === shape.id ? { ...item, points: straightenLine(item.points) } : item,
      ),
    );
  }

  /**
   * 변 가운데 손잡이를 누르면 그 자리에 꼭짓점을 끼워 넣고 곧바로 끌기를 시작한다.
   * 누르고 놓기만 해도 가운데에 점이 하나 생긴다.
   */
  function insertVertexAndDrag(
    shape: LocalMapShape,
    afterIndex: number,
    event: React.PointerEvent,
  ) {
    if (editingLocked || drawTool !== "select" || event.button !== 0) return;
    const points = shape.points;
    const next = points[(afterIndex + 1) % points.length];
    const inserted = midpointOf(points[afterIndex], next);
    setShapes((prev) =>
      prev.map((item) =>
        item.id === shape.id
          ? {
              ...item,
              points: [
                ...item.points.slice(0, afterIndex + 1),
                inserted,
                ...item.points.slice(afterIndex + 1),
              ],
            }
          : item,
      ),
    );
    startVertexDrag(shape, afterIndex + 1, event);
  }

  /** 꼭짓점 하나를 지운다. 최소 점수(폴리곤 3, 라인 2)보다 적어지면 거절한다. */
  function removeVertex(shape: LocalMapShape, index: number) {
    const minimum = SHAPE_MINIMUM_POINTS[shape.kind];
    if (shape.points.length <= minimum) {
      toast.error(`${SHAPE_LABEL[shape.kind]}은(는) 꼭짓점이 최소 ${minimum}개 필요합니다.`);
      return;
    }
    setShapes((prev) =>
      prev.map((item) =>
        item.id === shape.id
          ? { ...item, points: item.points.filter((_, at) => at !== index) }
          : item,
      ),
    );
  }

  /**
   * 말풍선에서 고른 유형으로 대상을 바꾼다.
   *
   * 설계서 "5. 유형 변경하기"는 대분류(핀·폴리곤·라인)를 고른 뒤 세부 유형을 고르게 한다.
   * 대분류가 달라지면 점 ↔ 도형이라 좌표 자체를 바꿔야 한다. 같은 노드를 유지해야
   * 저장 때 새 노드가 생기지 않으므로 nodeId는 그대로 옮긴다.
   */
  function changePinNodeType(booth: LocalBoothPin, nodeType: NodeType) {
    const category = categoryOfNodeType(nodeType);
    if (category === "pin") {
      setBooths((prev) =>
        prev.map((item) => (item.id === booth.id ? { ...item, nodeType } : item)),
      );
      return;
    }
    const shapeId = crypto.randomUUID();
    setShapes((prev) => [
      ...prev,
      {
        id: shapeId,
        nodeId: booth.nodeId,
        name: booth.name,
        nodeType,
        kind: category,
        points: defaultShapePoints({ lat: booth.lat, lng: booth.lng }, category),
        isNew: booth.isNew,
      },
    ]);
    setBooths((prev) => prev.filter((item) => item.id !== booth.id));
    // 구역 멤버는 서버가 부스 POINT만 받는다. 도형이 된 노드는 구역에서 빼 둔다.
    setZones((prev) =>
      prev
        .map((zone) => ({ ...zone, boothIds: zone.boothIds.filter((id) => id !== booth.id) }))
        .filter((zone) => zone.boothIds.length > 0),
    );
    setCheckedIds(new Set());
    setEditingBoothId(null);
    setSelectedShapeId(shapeId);
    toast.success(`${booth.name}을(를) ${SHAPE_LABEL[category]}(으)로 바꿨습니다.`, {
      description: "꼭짓점을 끌어 모양을 맞춘 뒤 저장을 눌러 주세요.",
    });
  }

  function changeShapeNodeType(shape: LocalMapShape, nodeType: NodeType) {
    const category = categoryOfNodeType(nodeType);
    if (category === shape.kind) {
      setShapes((prev) =>
        prev.map((item) => (item.id === shape.id ? { ...item, nodeType } : item)),
      );
      return;
    }
    if (category === "pin") {
      const center = shapeAnchor(shape);
      const pinId = crypto.randomUUID();
      setBooths((prev) => [
        ...prev,
        {
          id: pinId,
          nodeId: shape.nodeId,
          name: shape.name,
          nodeType,
          lat: center.lat,
          lng: center.lng,
          isNew: shape.isNew,
        },
      ]);
      setShapes((prev) => prev.filter((item) => item.id !== shape.id));
      setSelectedShapeId(null);
      setCheckedIds(new Set([pinId]));
      setEditingBoothId(pinId);
      toast.success(`${shape.name}을(를) 핀으로 바꿨습니다.`, {
        description: "저장을 눌러야 서버에 반영됩니다.",
      });
      return;
    }
    // 폴리곤 ↔ 라인. 점 개수 규칙이 달라 기존 중심을 기준으로 기본 모양을 다시 잡는다.
    const center = shapeAnchor(shape);
    setShapes((prev) =>
      prev.map((item) =>
        item.id === shape.id
          ? { ...item, nodeType, kind: category, points: defaultShapePoints(center, category) }
          : item,
      ),
    );
    toast.success(`${shape.name}을(를) ${SHAPE_LABEL[category]}(으)로 바꿨습니다.`, {
      description: "꼭짓점을 끌어 모양을 맞춘 뒤 저장을 눌러 주세요.",
    });
  }

  function toggleChecked(id: string) {
    setEditingBoothId(null);
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

  /**
   * 고른 부스를 구역에 넣는다.
   *
   * 구역은 두 갈래다. 체크박스로 묶은 구역은 부스 목록만 고치면 되지만, 폴리곤으로 그린
   * 구역은 소속을 좌표로 판정하므로(shapeIdByBoothId) 부스를 실제로 그 안으로 옮겨야 한다.
   * 이때 고른 부스들의 상대 배치는 그대로 두고 무리째 옮긴다 — 한 점에 쌓아 놓으면
   * 어느 부스가 어디였는지 다시 잡아야 한다.
   */
  function assignCheckedToZone(zoneId: string) {
    const ids = new Set(groupableBooths.map((booth) => booth.id));
    if (ids.size === 0) {
      toast.error("구역에는 부스만 넣을 수 있습니다.");
      return;
    }
    const polygon = polygonShapes.find((shape) => shape.id === zoneId);
    if (polygon) {
      const target = shapeAnchor(polygon);
      const delta = deltaBetween(centroidOf(groupableBooths), target);
      setBooths((prev) =>
        prev.map((booth) => {
          if (!ids.has(booth.id)) return booth;
          let moved = shiftPoint({ lat: booth.lat, lng: booth.lng }, delta);
          // 무리째 옮겨도 가장자리 부스는 구역 밖에 남을 수 있다. 안에 들어올 때까지 당긴다.
          for (let step = 0; step < 8 && !containsPoint(polygon.points, moved); step += 1) {
            moved = {
              lat: moved.lat + (target.lat - moved.lat) * 0.4,
              lng: moved.lng + (target.lng - moved.lng) * 0.4,
            };
          }
          return { ...booth, ...moved };
        }),
      );
      // 폴리곤 구역에 들어갔으니 체크박스로 묶어 둔 구역에서는 빼 준다. 두 구역에 겹치면
      // 서버가 저장 전체를 거부한다.
      setZones((prev) =>
        prev
          .map((zone) => ({
            ...zone,
            boothIds: zone.boothIds.filter((id) => !ids.has(id)),
          }))
          .filter((zone) => zone.boothIds.length > 0),
      );
      setSelectedShapeId(zoneId);
      toast.success(`${polygon.name}에 부스 ${ids.size}개를 넣었습니다.`, {
        description: "저장을 눌러야 서버에 반영됩니다.",
      });
      return;
    }

    const zone = zones.find((item) => item.id === zoneId);
    if (!zone) return;
    setZones((prev) =>
      prev
        .map((item) =>
          item.id === zoneId
            ? { ...item, boothIds: [...new Set([...item.boothIds, ...ids])] }
            : { ...item, boothIds: item.boothIds.filter((id) => !ids.has(id)) },
        )
        .filter((item) => item.boothIds.length > 0),
    );
    setSelectedZoneId(zoneId);
    setExpandedZoneIds((prev) => new Set(prev).add(zoneId));
    toast.success(`${zone.name}에 부스 ${ids.size}개를 넣었습니다.`);
  }

  /** 고른 부스를 묶어 둔 구역에서 뺀다. 폴리곤 구역 소속은 좌표라 여기서 풀 수 없다. */
  function ungroupChecked() {
    const ids = new Set(checkedBooths.map((booth) => booth.id));
    const inPolygon = checkedBooths.filter((booth) => shapeIdByBoothId.has(booth.id)).length;
    setZones((prev) =>
      prev
        .map((zone) => ({ ...zone, boothIds: zone.boothIds.filter((id) => !ids.has(id)) }))
        .filter((zone) => zone.boothIds.length > 0),
    );
    setSelectedZoneId(null);
    if (inPolygon > 0) {
      toast.info(`부스 ${inPolygon}개는 구역 폴리곤 안에 있어 그대로입니다.`, {
        description: "폴리곤 구역은 부스를 밖으로 끌어내야 소속이 풀립니다.",
      });
    }
  }

  /** 고른 부스를 한 줄로 고르게 세운다. 양 끝 부스는 자리를 지킨다. */
  function lineUpChecked() {
    if (checkedBooths.length < 2) return;
    const lined = lineUpPoints(checkedBooths.map((booth) => ({ lat: booth.lat, lng: booth.lng })));
    const byId = new Map(checkedBooths.map((booth, index) => [booth.id, lined[index]]));
    setBooths((prev) =>
      prev.map((booth) => {
        const placed = byId.get(booth.id);
        return placed ? { ...booth, ...placed } : booth;
      }),
    );
    toast.success(`부스 ${checkedBooths.length}개를 줄 세웠습니다.`, {
      description: "되돌리려면 실행취소(⌘Z)를 누르세요.",
    });
  }

  /**
   * 구역 순서를 한 칸 옮긴다.
   *
   * 이 순서가 저장 요청의 sortOrder가 되고, 스태프 앱의 구역 고르기 목록이 그 순서대로
   * 나열된다. 현장에서 자주 쓰는 구역을 위로 올릴 수 있어야 한다.
   */
  function moveZoneOrder(zoneId: string, direction: -1 | 1) {
    if (zones.some((zone) => zone.id === zoneId)) {
      setZones((prev) => {
        const from = prev.findIndex((zone) => zone.id === zoneId);
        const to = from + direction;
        if (from === -1 || to < 0 || to >= prev.length) return prev;
        const next = [...prev];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      });
      return;
    }
    // 폴리곤 구역은 shapes 배열 순서를 따른다. 사이에 낀 선 도형은 건너뛰고 폴리곤끼리 바꾼다.
    setShapes((prev) => {
      const from = prev.findIndex((shape) => shape.id === zoneId);
      if (from === -1) return prev;
      let to = from + direction;
      while (to >= 0 && to < prev.length && prev[to].kind !== "polygon") to += direction;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

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
    // 오른쪽 위 액션 바를 알림이 덮어 «저장하기» 클릭까지 막던 것을 피한다.
    setToastBelowActionBar(true);
    return () => {
      setHideNav(false);
      setFullBleed(false);
      setToastBelowActionBar(false);
    };
  }, [setHideNav, setFullBleed, setToastBelowActionBar]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        isTypingTarget(event.target) ||
        saveDialogOpen ||
        publishDialogOpen ||
        unpublishDialogOpen ||
        closeDialogOpen ||
        deleteBoundaryOpen ||
        saveMutation.isPending ||
        queueSaveMutation.isPending ||
        queuePlanBusy
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        setSpaceHeld(true);
        return;
      }
      if (event.ctrlKey || event.metaKey) setModifierHeld(true);
      if (event.shiftKey) setShiftHeld(true);
      if (event.key === "Escape") {
        cancelDraftShape();
        setBoundaryDraft([]);
        setQueueDraft([]);
        setDrawTool("select");
        return;
      }
      if (event.key === "Enter" && drawTool === "boundary") {
        event.preventDefault();
        finishBoundary();
        return;
      }
      if (
        event.key === "Enter" &&
        queueMode === "current" &&
        drawTool === "queue-line" &&
        queueDraft.length >= 2
      ) {
        event.preventDefault();
        queueSaveMutation.mutate(queueDraft);
        return;
      }
      if ((event.key === "Backspace" || event.key === "Delete") && drawTool === "boundary") {
        event.preventDefault();
        setBoundaryDraft((prev) => prev.slice(0, -1));
        return;
      }
      if ((event.key === "Backspace" || event.key === "Delete") && drawTool === "queue-line") {
        event.preventDefault();
        setQueueDraft((prev) => prev.slice(0, -1));
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setSpaceHeld(false);
      if (!event.ctrlKey && !event.metaKey) setModifierHeld(false);
      if (!event.shiftKey) setShiftHeld(false);
    }
    function resetModifiers() {
      setSpaceHeld(false);
      setModifierHeld(false);
      setShiftHeld(false);
    }
    window.addEventListener("blur", resetModifiers);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("blur", resetModifiers);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    closeDialogOpen,
    deleteBoundaryOpen,
    drawTool,
    finishBoundary,
    queueDraft,
    queueSaveMutation,
    queueMode,
    queuePlanBusy,
    publishDialogOpen,
    unpublishDialogOpen,
    saveDialogOpen,
    saveMutation.isPending,
  ]);

  useEffect(() => {
    const mapId = mapQuery.data?.mapId;
    const assetId = pamphlet?.assetId;
    const expiresAt = Date.parse(pamphlet?.imageUrlExpiresAt ?? "");
    if (!mapId || !assetId || !Number.isFinite(expiresAt)) return;
    let cancelled = false;
    const timer = window.setTimeout(
      async () => {
        try {
          const editor = await getMapEditor(festivalId, mapId);
          const fresh = editor.presentation?.overlay;
          if (cancelled || fresh?.assetId !== assetId || !fresh.imageUrl) return;
          setPamphlet((prev) =>
            prev?.assetId === assetId
              ? {
                  ...prev,
                  imageUrl: fresh.imageUrl!,
                  imageUrlExpiresAt: fresh.imageUrlExpiresAt,
                }
              : prev,
          );
        } catch {
          if (!cancelled)
            toast.error("팜플렛 이미지 주소 갱신에 실패했습니다. 편집 내용은 유지됩니다.");
        }
      },
      Math.min(2_147_483_647, Math.max(10_000, expiresAt - Date.now() - 30_000)),
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [festivalId, mapQuery.data?.mapId, pamphlet?.assetId, pamphlet?.imageUrlExpiresAt]);

  /** 이 부스가 어느 구역에 속하는지. 폴리곤 구역이 먼저고, 없으면 묶어 둔 구역을 본다. */
  function parentZoneNameOf(booth: LocalBoothPin) {
    const shapeId = shapeIdByBoothId.get(booth.id);
    if (shapeId) return polygonShapes.find((shape) => shape.id === shapeId)?.name ?? null;
    const zoneId = zoneIdByBoothId.get(booth.id);
    return zones.find((zone) => zone.id === zoneId)?.name ?? null;
  }

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
        /*
          고른 행의 배경은 패널 좌우 여백(p-6)까지 넓힌다. 안쪽으로 물러나 있으면 어디까지가
          골라진 것인지 눈으로 잘라 읽어야 한다. 음수 마진으로 여백을 되물리고 그만큼 다시
          패딩을 준다 — 들여쓴 행은 24px(패널 여백) + 28px(들여쓰기)라 pl-13이 된다.
        */
        className={`-mx-6 flex items-center gap-2 rounded-md py-2 pr-6 transition-[background-color,opacity] duration-150 ${
          indent ? "pl-13" : "pl-7"
        } ${dragBoothId === booth.id ? "opacity-40" : ""} ${
          dragBoothId && dragBoothId !== booth.id ? "hover:bg-zinc-100" : ""
        } ${checkedIds.has(booth.id) ? "bg-primary/10" : ""}`}
      >
        {/* 구역 멤버는 서버가 부스만 받는다. 시설을 섞으면 저장 전체가 거부되므로 선택을 막는다. */}
        <span
          title={booth.nodeType === "BOOTH" ? undefined : "구역에는 부스만 묶을 수 있습니다."}
          className="flex"
        >
          <Checkbox
            checked={checkedIds.has(booth.id)}
            onCheckedChange={() => toggleChecked(booth.id)}
            disabled={booth.nodeType !== "BOOTH" || editingLocked}
            className="border-zinc-200"
          />
        </span>
        {/* 체크박스를 정확히 짚지 않아도 이름을 누르면 골라진다. Shift면 선택에 더한다. */}
        <button
          type="button"
          onClick={(event) => {
            if (event.shiftKey) {
              toggleChecked(booth.id);
              return;
            }
            setSelectedZoneId(zoneIdByBoothId.get(booth.id) ?? null);
            setCheckedIds(new Set([booth.id]));
            setEditingBoothId(booth.id);
            setBoothListOpen(false);
          }}
          className="flex min-w-0 flex-1 items-center gap-1"
        >
          <span
            title={NODE_TYPE_LABEL[booth.nodeType] ?? "시설"}
            className={`size-4 shrink-0 [&_svg]:size-4 ${
              booth.uncertain ? "text-secondary-600" : "text-primary"
            }`}
          >
            {nodeTypeIcon(booth.nodeType)}
          </span>
          <span className="body-regular truncate text-left text-zinc-950">{booth.name}</span>
          {booth.uncertain ? (
            <span className="body-caption shrink-0 rounded-full bg-secondary-600/10 px-1.5 text-secondary-600">
              검수
            </span>
          ) : null}
          {/* 구역 아래에 접어 놓은 행은 이미 소속이 보인다. 평면으로 놓인 행에만 붙인다. */}
          {!indent && parentZoneNameOf(booth) ? (
            <span className="body-caption ml-auto max-w-24 shrink-0 truncate rounded-full bg-primary/10 px-1.5 text-primary">
              {parentZoneNameOf(booth)}
            </span>
          ) : null}
        </button>
        <span
          onMouseDown={() => {
            if (!editingLocked) setDraggableRowId(booth.id);
          }}
          onMouseUp={() => setDraggableRowId(null)}
          className={cn(
            "shrink-0 touch-none text-zinc-400",
            editingLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
          )}
        >
          <HamburgerMenuIcon />
        </span>
      </div>
    );
  }

  if (mapQuery.isError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 px-8">
        <div className="max-w-md text-center">
          <p className="body-regular-bold text-zinc-950">
            {getApiErrorMessage(mapQuery.error, "부스맵을 준비하지 못했습니다.")}
          </p>
          <p className="body-small mt-2 text-zinc-500">
            축제 장소에 위도·경도가 없으면 부스맵을 만들 수 없습니다. 축제관리에서 주소를 다시
            검색해 좌표를 저장한 뒤 다시 시도해 주세요.
          </p>
        </div>
      </div>
    );
  }

  // 편집 데이터를 못 불러왔는데 그대로 열면 "부스 0개"로 보인다.
  // 그 상태에서 저장하면 서버에 있는 부스를 전부 지우는 요청이 나간다.
  if (editorQuery.isError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 px-8">
        <div className="max-w-md text-center">
          <p className="body-regular-bold text-zinc-950">
            {getApiErrorMessage(editorQuery.error, "부스 정보를 불러오지 못했습니다.")}
          </p>
          <p className="body-small mt-2 text-zinc-500">
            편집 중인 부스가 사라지는 것을 막기 위해 편집기를 열지 않았습니다. 잠시 후 다시 시도해
            주세요.
          </p>
          <Button type="button" className="mt-4" onClick={() => editorQuery.refetch()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  if (!mapCenter) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-50 px-8">
        <div className="max-w-md text-center">
          <p className="body-regular-bold text-zinc-950">축제 위치가 등록되지 않았습니다.</p>
          <p className="body-small mt-2 text-zinc-500">
            축제관리에서 주소를 검색해 위도·경도를 저장한 뒤 다시 시도해 주세요.
          </p>
        </div>
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
          onPointerDown={handleMapPointerDown}
          className={cn(
            "absolute inset-0 isolate",
            drawTool !== "select" && "cursor-crosshair",
            // Shift를 누르면 빈 지도를 끌어 범위로 고를 수 있다는 것을 커서로 알린다.
            drawTool === "select" && shiftHeld && !panOverride && "cursor-crosshair",
            drawTool === "marquee" && "cursor-crosshair",
          )}
        >
          <KakaoMap
            center={mapCenter}
            isPanto={false}
            level={mapLevel}
            /*
              휠로 바로 확대·축소한다. 예전에는 이 값을 false로 두고 Ctrl+휠만 직접 받았는데,
              그냥 휠을 굴리면 아무 일도 일어나지 않아 지도가 멈춘 것처럼 보였다.
              끄는 동안에는 setZoomable(false)로 따로 잠근다 — 좌표 기준이 바뀌면 끌던 것이 튄다.
            */
            scrollwheel
            /*
              도형 그리기를 더블클릭으로 끝내는데, 카카오 기본 더블클릭 확대가 같이
              걸려 그릴 때마다 지도가 한 단계씩 확대됐다. 확대는 오른쪽 아래 버튼으로
              한다. 이 값은 지도 생성 때만 반영되므로 상수로 둔다.
            */
            disableDoubleClickZoom
            className="h-full w-full"
            onCreate={(map) => {
              kakaoMapRef.current = map;
              setKakaoMap(map);
              map.setMinLevel(MIN_MAP_LEVEL);
              map.setMaxLevel(MAX_MAP_LEVEL);
            }}
            /*
              휠로 확대하면 카카오가 제 확대 단계를 직접 바꾼다. 그 값을 되받아 두지
              않으면 확대/축소 버튼이 화면과 어긋난 단계에서 다시 시작해 지도가 튄다.
            */
            onZoomChanged={(map) => setMapLevel(map.getLevel())}
            onClick={(_target, mouseEvent) => {
              if (editingLocked || panOverride || queuePlanBusy || queueSaveMutation.isPending)
                return;
              const latLng = mouseEvent.latLng;
              if (!latLng) return;
              const point = { lat: latLng.getLat(), lng: latLng.getLng() };
              if (drawTool === "pin") {
                addBoothAt(point.lat, point.lng);
                return;
              }
              if (drawTool === "polygon" || drawTool === "line") {
                // 첫 꼭짓점을 다시 누르면 도형을 닫는다(더블클릭의 첫 번째 클릭도 여기서 걸린다).
                if (closesDraft(draftPoints, point, SHAPE_MINIMUM_POINTS[drawTool])) {
                  finishDraftShape();
                  return;
                }
                if (isSamePlace(draftPoints[draftPoints.length - 1], point)) return;
                addDraftPoint(point.lat, point.lng);
                return;
              }
              if (drawTool === "boundary") {
                if (closesDraft(boundaryDraft, point, 3)) {
                  finishBoundary();
                  return;
                }
                if (isSamePlace(boundaryDraft[boundaryDraft.length - 1], point)) return;
                setBoundaryDraft((prev) => [...prev, point]);
                return;
              }
              if (drawTool === "queue-line" && (queueMode === "plan" || queueDraftId)) {
                if (queueMode === "plan" && selectedPlanQuery.isPending) return;
                if (isSamePlace(queueDraft[queueDraft.length - 1], point)) return;
                setQueueDraft((prev) =>
                  queueMode === "current" && selectedPlanQuery.data
                    ? [snapToQueuePath(selectedPlanQuery.data.path, point)]
                    : [...prev, point],
                );
              }
            }}
            /*
              화면설계서 FE-05: Enter 또는 첫 꼭짓점 근처 더블클릭으로 그리기를 끝낸다.
              더블클릭은 클릭 두 번이 먼저 오므로, 같은 자리 중복 점은 위에서 걸러 둔다.
            */
            onDoubleClick={() => {
              if (editingLocked || panOverride || queuePlanBusy || queueSaveMutation.isPending)
                return;
              if (drawTool === "polygon" || drawTool === "line") {
                finishDraftShape();
                return;
              }
              if (drawTool === "boundary") {
                finishBoundary();
                return;
              }
              if (queueMode === "current" && drawTool === "queue-line" && queueDraft.length >= 2) {
                queueSaveMutation.mutate(queueDraft);
              }
            }}
          >
            <PamphletOverlay
              map={kakaoMap}
              imageUrl={pamphlet?.imageUrl ?? null}
              corners={pamphlet?.corners ?? null}
              boundary={siteBoundary}
              clipToBoundary={Boolean(pamphlet?.clipToBoundary && siteBoundary)}
              opacity={pamphlet?.opacity ?? 0.7}
              visible={Boolean(pamphlet?.visible)}
              interactive
              onImageError={() =>
                toast.error("팜플렛 이미지를 표시하지 못했습니다. 핀과 경계는 그대로 둡니다.")
              }
            />
            <QueuePathLayer queues={queuePathItems} />
            {queueMode === "current" &&
            queueTailOnly &&
            drawTool === "queue-line" &&
            queueDraft.length === 1 ? (
              <CustomOverlayMap position={queueDraft[0]} yAnchor={1}>
                <div className="rounded-md border border-primary bg-white px-2 py-1 body-caption text-primary">
                  선택한 줄끝
                </div>
              </CustomOverlayMap>
            ) : null}
            {selectedPlanQuery.data && !(queueMode === "plan" && drawTool === "queue-line") ? (
              <Polyline
                path={selectedPlanQuery.data.path}
                strokeColor="#236CF6"
                strokeWeight={3}
                strokeOpacity={0.5}
                strokeStyle="dash"
              />
            ) : null}
            {queueMode === "plan" && drawTool === "queue-line" && queueDraft.length >= 2 ? (
              <Polyline
                path={queueDraft.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))}
                strokeColor="#236CF6"
                strokeWeight={4}
                strokeStyle="dash"
              />
            ) : null}
            {drawTool === "queue-line"
              ? queueDraft.map((point, index) =>
                  Number.isFinite(point.lat) && Number.isFinite(point.lng) ? (
                    <CustomOverlayMap key={`queue-point-${index}`} position={point} zIndex={25}>
                      <button
                        type="button"
                        aria-label={`줄 지점 ${index + 1} 이동`}
                        data-map-tools
                        disabled={
                          (index === 0 && queueMode === "plan") ||
                          editingLocked ||
                          hasUnsavedChanges ||
                          queuePlanBusy ||
                          queueSaveMutation.isPending ||
                          (queueMode === "plan" && selectedPlanQuery.isPending)
                        }
                        onPointerDown={(event) => startQueuePointDrag(index, event)}
                        onClick={(event) => event.stopPropagation()}
                        title={`지점 ${index + 1}`}
                        className="flex size-6 touch-none items-center justify-center bg-transparent cursor-grab disabled:cursor-default"
                      >
                        <span className="size-2.5 rounded-full border border-primary bg-white" />
                      </button>
                    </CustomOverlayMap>
                  ) : null,
                )
              : null}
            {marquee ? (
              <Rectangle
                bounds={{
                  sw: { lat: marquee.south, lng: marquee.west },
                  ne: { lat: marquee.north, lng: marquee.east },
                }}
                fillColor="#236cf6"
                fillOpacity={0.08}
                strokeColor="#236cf6"
                strokeWeight={2}
                strokeStyle="shortdash"
                zIndex={40}
              />
            ) : null}
            {siteBoundary && siteBoundary.length >= 3 ? (
              <Polygon
                path={siteBoundary}
                fillColor="#18181b"
                fillOpacity={0.04}
                strokeColor="#18181b"
                strokeWeight={3}
                strokeOpacity={0.9}
              />
            ) : null}
            {boundaryDraft.length >= 2 ? (
              <Polyline
                path={boundaryDraft}
                strokeColor="#18181b"
                strokeWeight={2}
                strokeStyle="shortdash"
              />
            ) : null}
            {pendingGroupMembers.length >= 2 ? (
              <>
                <Polygon
                  path={zonePolygonPath(pendingGroupMembers)}
                  fillColor="#236cf6"
                  fillOpacity={0.1}
                  strokeColor="#236cf6"
                  strokeWeight={2}
                  strokeOpacity={0.8}
                />
                {zonePolygonPath(pendingGroupMembers).map((point, index) => (
                  <CustomOverlayMap key={`pending-group-${index}`} position={point} zIndex={15}>
                    <span className="block size-2.5 rounded-full border-2 border-primary bg-white shadow" />
                  </CustomOverlayMap>
                ))}
              </>
            ) : null}
            {standaloneZones
              .filter((zone) => !selectedZoneId || zone.id === selectedZoneId)
              .map((zone) => {
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
            {shapes.map((shape) => {
              const checked = checkedIds.has(shape.id);
              const selected = shape.id === selectedShapeId || checked;
              const select = () => {
                // 끌어서 옮긴 직후의 click은 선택이 아니다.
                if (movedRef.current) {
                  movedRef.current = false;
                  return;
                }
                if (shiftHeld) {
                  toggleChecked(shape.id);
                  return;
                }
                setCheckedIds(new Set([shape.id]));
                setSelectedShapeId(shape.id);
                setEditingBoothId(null);
              };
              const path = shapePointsOf(shape);
              // 다른 도형을 고른 동안에는 흐리게 두어 지금 편집 중인 도형이 눈에 띄게 한다.
              const dimmed = (selectedShapeId !== null || checkedIds.size > 0) && !selected;
              // 고른 도형은 흰 테두리를 한 겹 깔아 지도 색과 겹쳐도 윤곽이 보이게 한다.
              const halo = selected ? (
                <Polyline
                  path={shape.kind === "polygon" ? [...path, path[0]] : path}
                  strokeColor="#ffffff"
                  strokeWeight={shape.kind === "polygon" ? 8 : 11}
                  strokeOpacity={0.9}
                  zIndex={1}
                />
              ) : null;
              return shape.kind === "polygon" ? (
                <Fragment key={shape.id}>
                  {halo}
                  <Polygon
                    path={path}
                    fillColor="#236cf6"
                    fillOpacity={selected ? 0.3 : dimmed ? 0.05 : 0.1}
                    strokeColor="#236cf6"
                    strokeWeight={selected ? 4 : 2}
                    strokeOpacity={dimmed ? 0.4 : 0.8}
                    zIndex={selected ? 2 : 0}
                    onClick={select}
                  />
                </Fragment>
              ) : (
                <Fragment key={shape.id}>
                  {halo}
                  <Polyline
                    path={path}
                    strokeColor="#236cf6"
                    strokeWeight={selected ? 7 : 4}
                    strokeOpacity={dimmed ? 0.4 : 0.9}
                    zIndex={selected ? 2 : 0}
                    onClick={select}
                  />
                </Fragment>
              );
            })}
            {/*
              고른 도형의 꼭짓점 손잡이. 끌면 모양이 바뀌고 Alt(또는 Shift)를 누른 채
              누르면 그 점을 지운다. 그리는 중에는 새 점 찍기와 헷갈리므로 숨긴다.
            */}
            {selectedShape && !editingLocked && drawTool === "select"
              ? shapePointsOf(selectedShape).map((point, index) => (
                  <CustomOverlayMap
                    key={`${selectedShape.id}-vertex-${index}`}
                    position={point}
                    clickable
                    zIndex={25}
                  >
                    <button
                      type="button"
                      aria-label={`꼭짓점 ${index + 1}`}
                      title="끌어서 이동 · Alt를 누른 채 누르면 삭제"
                      onPointerEnter={() => {
                        vertexHoveredRef.current = true;
                        kakaoMapRef.current?.setDraggable(false);
                      }}
                      onPointerLeave={() => {
                        vertexHoveredRef.current = false;
                        if (!vertexDraggingRef.current) kakaoMapRef.current?.setDraggable(true);
                      }}
                      onPointerDown={(event) => {
                        if (event.altKey || event.shiftKey) {
                          event.preventDefault();
                          event.stopPropagation();
                          removeVertex(selectedShape, index);
                          return;
                        }
                        startVertexDrag(selectedShape, index, event);
                      }}
                      className="flex size-6 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
                    >
                      <span className="block size-3.5 rounded-full border-2 border-primary bg-white shadow" />
                    </button>
                  </CustomOverlayMap>
                ))
              : null}
            {selectedShape && !editingLocked && drawTool === "select" && !draggingVertex
              ? shapePointsOf(selectedShape)
                  .slice(0, selectedShape.kind === "polygon" ? undefined : -1)
                  .map((point, index, list) => {
                    const all = shapePointsOf(selectedShape);
                    const next = all[(index + 1) % all.length];
                    return (
                      <CustomOverlayMap
                        key={`${selectedShape.id}-mid-${index}-${list.length}`}
                        position={midpointOf(point, next)}
                        clickable
                        zIndex={24}
                      >
                        <button
                          type="button"
                          aria-label={`${index + 1}번과 ${((index + 1) % all.length) + 1}번 점 사이에 점 추가`}
                          title="눌러서 점 추가 · 끌어서 모양 바꾸기"
                          onPointerEnter={() => {
                            vertexHoveredRef.current = true;
                            kakaoMapRef.current?.setDraggable(false);
                          }}
                          onPointerLeave={() => {
                            vertexHoveredRef.current = false;
                            if (!vertexDraggingRef.current) kakaoMapRef.current?.setDraggable(true);
                          }}
                          onPointerDown={(event) =>
                            insertVertexAndDrag(selectedShape, index, event)
                          }
                          className="flex size-6 cursor-copy touch-none items-center justify-center"
                        >
                          <span className="flex size-3.5 items-center justify-center rounded-full border border-primary bg-white text-primary opacity-80 shadow-sm hover:opacity-100 [&_svg]:size-2.5">
                            <PlusIcon />
                          </span>
                        </button>
                      </CustomOverlayMap>
                    );
                  })
              : null}
            {/* 그리는 중인 도형 — 확정 전이라 점선으로 구분해 보여 준다. */}
            {draftPoints.length >= 2 ? (
              drawTool === "polygon" && draftPoints.length >= 3 ? (
                <Polygon
                  path={draftPoints}
                  fillColor="#236cf6"
                  fillOpacity={0.1}
                  strokeColor="#236cf6"
                  strokeWeight={2}
                  strokeStyle="shortdash"
                />
              ) : (
                <Polyline
                  path={draftPoints}
                  strokeColor="#236cf6"
                  strokeWeight={3}
                  strokeStyle="shortdash"
                />
              )
            ) : null}
            {draftPoints.map((point, index) => (
              <CustomOverlayMap key={`draft-${index}`} position={point} zIndex={25}>
                <span className="block size-2.5 rounded-full border-2 border-primary bg-white shadow" />
              </CustomOverlayMap>
            ))}
            {visibleBooths.map((booth) => {
              const isSelected = booth.id === selectedId;
              // 여럿을 골랐을 때의 표시. 편집 중인 하나(isSelected)와 구분해 파란 테를 두른다.
              const isChecked = checkedIds.has(booth.id);
              return (
                <CustomOverlayMap
                  key={booth.id}
                  position={pinPositionOf(booth)}
                  clickable
                  zIndex={isSelected ? 20 : 10}
                >
                  <button
                    type="button"
                    title={editingLocked ? booth.name : `${booth.name} (끌어서 위치 이동)`}
                    aria-label={booth.name}
                    /*
                      카카오맵은 지도 엘리먼트에서 네이티브 mousedown을 먼저 잡아 패닝을
                      시작한다. React 핸들러는 그 뒤에 오므로 누른 다음 잠그면 이미 늦어
                      핀과 지도가 함께 움직인다. 커서가 핀에 올라온 순간 미리 잠근다.
                    */
                    onPointerEnter={() => {
                      pinHoveredRef.current = true;
                      if (!editingLocked && !panOverride && drawTool !== "pin") {
                        kakaoMapRef.current?.setDraggable(false);
                      }
                    }}
                    onPointerLeave={() => {
                      pinHoveredRef.current = false;
                      if (!movingRef.current) kakaoMapRef.current?.setDraggable(true);
                    }}
                    onPointerDown={(event) => {
                      // Shift는 «선택에 더하기»라 끌기로 보지 않는다.
                      if (event.shiftKey) return;
                      event.preventDefault();
                      event.stopPropagation();
                      startObjectDrag(moveTargetsOf(booth.id), event);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      // 끌어서 옮긴 직후의 click은 선택이 아니다.
                      if (movedRef.current) {
                        movedRef.current = false;
                        return;
                      }
                      if (isPanModifier(event)) {
                        setSelectedZoneId(zoneIdByBoothId.get(booth.id) ?? null);
                        setCheckedIds(new Set([booth.id]));
                        setEditingBoothId(null);
                        return;
                      }
                      if (event.shiftKey) {
                        toggleChecked(booth.id);
                        return;
                      }
                      setSelectedZoneId(zoneIdByBoothId.get(booth.id) ?? null);
                      setCheckedIds(new Set([booth.id]));
                      setEditingBoothId(booth.id);
                      setBoothListOpen(false);
                    }}
                    /*
                      아이콘을 넣으면서 히트 영역을 넉넉히 잡는다(28px). 점(12px)만 할 때는
                      살짝만 빗나가도 지도 클릭으로 새어 핀 대신 지도가 움직였다.
                    */
                    className={cn(
                      "relative flex size-7 touch-none items-center justify-center",
                      editingLocked || drawTool === "pin"
                        ? "cursor-default"
                        : moveDraft?.ids.has(booth.id)
                          ? "cursor-grabbing"
                          : "cursor-grab",
                    )}
                  >
                    {/*
                      부스는 지도에 가장 많이 찍히는 유형이라 원래대로 점으로 둔다.
                      화장실·입구·출구·시설만 아이콘으로 구분한다 — 부스와 섞였을 때
                      무엇인지 알 수 없던 것이 문제였지 부스 자체는 아니었다.
                      AI가 찾아 검수가 필요한 핀은 유형과 상관없이 색으로 구분한다.
                    */}
                    {/*
                      고른 것을 한눈에 알아야 여러 개를 함께 옮길 수 있다. 점 뒤에 파란 테를
                      한 겹 깔아, 편집 중인 하나(주황 후광)와 겹쳐 있어도 둘 다 보이게 한다.
                    */}
                    {isChecked ? (
                      <span className="absolute size-6 rounded-full border-2 border-primary bg-primary/15" />
                    ) : null}
                    {booth.nodeType === "BOOTH" ? (
                      <>
                        {isSelected ? (
                          <span className="absolute size-3 rounded-full bg-point-600/25" />
                        ) : null}
                        <span
                          className={cn(
                            "relative rounded-full",
                            isSelected ? "size-1" : "size-3 shadow-sm",
                            booth.uncertain ? "bg-secondary-600" : "bg-point-600",
                          )}
                        />
                      </>
                    ) : (
                      <span
                        className={cn(
                          "relative flex size-5 items-center justify-center rounded-full border border-white text-white shadow-sm [&_svg]:size-3",
                          booth.uncertain ? "bg-secondary-600" : "bg-point-600",
                          isSelected && "ring-2 ring-point-600/40",
                        )}
                      >
                        {nodeTypeIcon(booth.nodeType)}
                      </span>
                    )}
                  </button>
                </CustomOverlayMap>
              );
            })}
            {/*
              그리기 도구를 켜면 말풍선은 접는다. 대기줄처럼 부스를 고른 뒤 쓰는 도구는
              선택을 그대로 둬야 하는데, 말풍선까지 떠 있으면 그릴 자리를 가린다.
            */}
            {selectedBooth && !editingLocked && drawTool === "select" && checkedIds.size <= 1 ? (
              <CustomOverlayMap
                position={pinPositionOf(selectedBooth)}
                {...POPOVER_ANCHORS}
                zIndex={30}
              >
                <MapInfoPopover
                  key={selectedBooth.id}
                  mode="booth-edit"
                  style={{ position: "static" }}
                  extraSection={boothQueueActions}
                  initialName={selectedBooth.name}
                  typeLabel={NODE_TYPE_LABEL[selectedBooth.nodeType] ?? "시설"}
                  parentZoneName={selectedBoothParentName}
                  confirmLabel={selectedBooth.isNew ? "등록" : "수정"}
                  hideCancel
                  onChangeNodeType={(nodeType) => changePinNodeType(selectedBooth, nodeType)}
                  onConfirm={(name) => {
                    setBooths((prev) =>
                      prev.map((booth) =>
                        booth.id === selectedBooth.id ? { ...booth, name, isNew: false } : booth,
                      ),
                    );
                    setCheckedIds(new Set());
                    setEditingBoothId(null);
                    setSelectedZoneId(null);
                  }}
                  onCancel={() => {
                    setCheckedIds(new Set());
                    setEditingBoothId(null);
                    setSelectedZoneId(null);
                  }}
                  onDelete={() => {
                    if (selectedBooth.nodeId) {
                      setDeletedNodeIds((prev) => [...prev, selectedBooth.nodeId!]);
                    }
                    setBooths((prev) => prev.filter((booth) => booth.id !== selectedBooth.id));
                    setZones((prev) =>
                      prev
                        .map((zone) => ({
                          ...zone,
                          boothIds: zone.boothIds.filter((id) => id !== selectedBooth.id),
                        }))
                        .filter((zone) => zone.boothIds.length > 0),
                    );
                    setCheckedIds(new Set());
                    setEditingBoothId(null);
                    setSelectedZoneId(null);
                  }}
                />
              </CustomOverlayMap>
            ) : null}
            {selectedShape && !editingLocked && drawTool === "select" ? (
              <CustomOverlayMap
                position={shapePopoverAnchor({
                  ...selectedShape,
                  points: shapePointsOf(selectedShape),
                })}
                {...POPOVER_ANCHORS}
                zIndex={30}
              >
                <MapInfoPopover
                  mode="booth-edit"
                  style={{ position: "static" }}
                  initialName={selectedShape.name}
                  typeLabel={SHAPE_LABEL[selectedShape.kind]}
                  onChangeNodeType={(nodeType) => changeShapeNodeType(selectedShape, nodeType)}
                  confirmLabel={selectedShape.isNew ? "등록" : "수정"}
                  hideCancel
                  onConfirm={(name) => {
                    setShapes((prev) =>
                      prev.map((shape) =>
                        shape.id === selectedShape.id ? { ...shape, name, isNew: false } : shape,
                      ),
                    );
                    setSelectedShapeId(null);
                    // 도형 편집은 아직 초안이다. 저장을 눌러야 서버로 간다.
                    toast.success(`${name}을(를) 반영했습니다.`, {
                      description: "저장을 눌러야 서버에 반영됩니다.",
                    });
                  }}
                  onCancel={() => setSelectedShapeId(null)}
                  onDelete={() => deleteShape(selectedShape.id)}
                  extraSection={
                    <ShapeEditSection
                      kind={selectedShape.kind}
                      points={shapePointsOf(selectedShape)}
                      onApplyPreset={(preset) => applyShapePreset(selectedShape, preset)}
                      onStraighten={() => straightenShape(selectedShape)}
                    />
                  }
                />
              </CustomOverlayMap>
            ) : null}
            {groupPopoverOpen
              ? (() => {
                  if (pendingGroupMembers.length < 2) return null;
                  return (
                    <CustomOverlayMap
                      position={centroidOf(pendingGroupMembers)}
                      {...POPOVER_ANCHORS}
                      zIndex={30}
                    >
                      <MapInfoPopover
                        mode="group-create"
                        style={{ position: "static" }}
                        initialName="새 구역"
                        confirmLabel="등록"
                        hideCancel
                        onConfirm={(name) => {
                          const zone: LocalZone = {
                            id: createZoneId(),
                            name,
                            // 부스가 아닌 노드가 섞이면 저장이 통째로 거부된다.
                            boothIds: booths
                              .filter(
                                (booth) => checkedIds.has(booth.id) && booth.nodeType === "BOOTH",
                              )
                              .map((booth) => booth.id),
                          };
                          setZones((prev) => [...prev, zone]);
                          setExpandedZoneIds((prev) => new Set(prev).add(zone.id));
                          setSelectedZoneId(zone.id);
                          setCheckedIds(new Set());
                          setGroupPopoverOpen(false);
                        }}
                        onCancel={() => setGroupPopoverOpen(false)}
                        onDelete={() => setGroupPopoverOpen(false)}
                        onChangeType={(type) =>
                          toast.info(
                            `"${type === "pin" ? "핀" : type === "polygon" ? "폴리곤" : "라인"}"으로 유형 변경은 아직 연결되지 않았습니다`,
                          )
                        }
                      />
                    </CustomOverlayMap>
                  );
                })()
              : null}
            {selectedZone &&
            !selectedBooth &&
            !selectedShape &&
            !editingLocked &&
            checkedIds.size === 0 &&
            selectedZoneMembers.length > 0 ? (
              <CustomOverlayMap
                position={centroidOf(selectedZoneMembers)}
                {...POPOVER_ANCHORS}
                zIndex={30}
              >
                <MapInfoPopover
                  mode="zone-edit"
                  style={{ position: "static" }}
                  initialName={selectedZone.name}
                  confirmLabel="수정"
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

      {/*
        분석 안내와 팜플렛 배치 패널은 부스 목록 오른쪽 위 같은 자리를 쓴다. 각자
        absolute로 두면 둘 다 떠 있을 때 겹치므로 한 세로 열에 쌓는다.
      */}
      <div
        className={cn(
          // 좁은 화면에서는 "부스 목록" 버튼(top-28)과 목록 패널(top-44)이 왼쪽 위를 쓴다.
          // 그 아래로 내리고, 목록을 펼친 동안에는 숨긴다.
          "pointer-events-none absolute top-44 left-4 z-20 flex w-72 flex-col gap-3 lg:top-10 lg:left-[23rem] lg:flex",
          boothListOpen && "hidden",
        )}
      >
        {/*
          분석이 도는 동안에만 지도 위에 남긴다. 끝난 결과는 우측 상단 알림으로 나가므로
          카드까지 띄우면 같은 말이 두 번 화면을 가린다.
        */}
        {analysis.isRunning && dismissedAnalysisKey !== analysisNoticeKey ? (
          <MapAnalysisProgressCard
            analysis={analysis}
            className="pointer-events-auto w-full"
            onDismiss={() => setDismissedAnalysisKey(analysisNoticeKey)}
          />
        ) : null}
      </div>

      <Button
        variant="outline"
        className="absolute top-28 left-4 lg:hidden"
        aria-expanded={boothListOpen}
        onClick={() => setBoothListOpen((open) => !open)}
      >
        {boothListOpen ? "부스 목록 닫기" : "부스 목록"}
      </Button>
      <div
        ref={boothListRef}
        className={cn(
          "absolute top-44 bottom-4 left-4 w-[calc(100%-80px)] lg:top-10 lg:bottom-10 lg:left-8 lg:block lg:w-72",
          // 하단 선택 바(72px)가 떠 있으면 목록이 그 아래로 깔려 마지막 행이 가려진다.
          selectionBarOpen && "bottom-[88px] lg:bottom-[88px]",
          !boothListOpen && "hidden",
        )}
      >
        <MapSidePanel className="h-full w-full">
          <p className="body-large-bold text-zinc-950">
            {/* 공개 안내와 숫자가 어긋나지 않게 부스만 센다(입구·화장실 같은 시설은 뺀다). */}
            축제부스 <span className="text-primary">{boothOnlyCount}</span>
            {reviewRequiredCount > 0 ? (
              <span className="body-small ml-2 text-secondary-600">
                검수 필요 {reviewRequiredCount}
              </span>
            ) : null}
          </p>
          <div className="flex flex-col gap-2 rounded-md bg-zinc-100 px-4 py-3 text-left">
            <p className="body-small-bold text-zinc-950">
              {isCompleted
                ? "종료된 축제입니다."
                : analyzing
                  ? "AI가 배치도를 읽고 있습니다."
                  : booths.length === 0
                    ? "아직 찍은 부스가 없습니다."
                    : reviewRequiredCount > 0
                      ? "AI가 찾은 부스를 확인해 주세요."
                      : "지도에서 부스를 편집하세요."}
            </p>
            <p className="body-caption text-zinc-950">
              {isCompleted
                ? "결과리포트가 이 배치를 근거로 삼기 때문에 부스맵은 더 이상 수정할 수 없습니다. 지난 축제의 배치는 그대로 확인할 수 있습니다."
                : analyzing
                  ? "분석이 끝나면 찾은 부스가 지도에 표시됩니다. 그때까지 편집과 저장은 막힙니다."
                  : booths.length === 0
                    ? "오른쪽 핀 도구를 켜 지도를 클릭하거나, 배치도 이미지를 올려 AI 분석을 돌리세요."
                    : reviewRequiredCount > 0
                      ? "주황색 핀은 AI가 찾은 위치라 정확하지 않을 수 있습니다. 끌어서 옮기고 이름을 확인해 주세요."
                      : "핀을 선택해 이름을 바꾸고, 여러 개를 골라 구역으로 묶을 수 있습니다."}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            {standaloneZones.map((zone, index) => {
              const members = booths.filter((booth) => zone.boothIds.includes(booth.id));
              const expanded = expandedZoneIds.has(zone.id);
              return (
                <ZoneListItem
                  key={zone.id}
                  name={zone.name}
                  count={members.length}
                  expanded={expanded}
                  checked={selectedZoneId === zone.id}
                  selected={selectedZoneId === zone.id}
                  onMoveUp={() => moveZoneOrder(zone.id, -1)}
                  onMoveDown={() => moveZoneOrder(zone.id, 1)}
                  moveUpDisabled={editingLocked || index === 0}
                  moveDownDisabled={editingLocked || index === standaloneZones.length - 1}
                  onToggleExpanded={() => toggleZoneExpanded(zone.id)}
                  onCheckedChange={(checked) =>
                    checked ? selectZone(zone.id) : setSelectedZoneId(null)
                  }
                  onSelect={() => selectZone(zone.id)}
                >
                  {members.map((booth) => renderBoothRow(booth, { indent: true }))}
                </ZoneListItem>
              );
            })}
            {ungroupedBooths.map((booth) => renderBoothRow(booth, { indent: false }))}
          </div>

          {/* 구역 폴리곤은 그 안에 든 부스를 하위로 품는다(화면설계서 4-6). */}
          {polygonShapes.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-zinc-200 pt-3">
              {polygonShapes.map((shape, index) => {
                const members = booths.filter(
                  (booth) => shapeIdByBoothId.get(booth.id) === shape.id,
                );
                return (
                  <ZoneListItem
                    key={shape.id}
                    name={shape.name}
                    count={members.length}
                    expanded={expandedZoneIds.has(shape.id)}
                    checked={selectedShapeId === shape.id || checkedIds.has(shape.id)}
                    selected={selectedShapeId === shape.id || checkedIds.has(shape.id)}
                    onMoveUp={() => moveZoneOrder(shape.id, -1)}
                    onMoveDown={() => moveZoneOrder(shape.id, 1)}
                    moveUpDisabled={editingLocked || index === 0}
                    moveDownDisabled={editingLocked || index === polygonShapes.length - 1}
                    onToggleExpanded={() => toggleZoneExpanded(shape.id)}
                    onCheckedChange={(checked) => {
                      setEditingBoothId(null);
                      setSelectedShapeId(checked ? shape.id : null);
                    }}
                    onSelect={() => {
                      setEditingBoothId(null);
                      setSelectedShapeId(shape.id);
                    }}
                  >
                    {members.map((booth) => renderBoothRow(booth, { indent: true }))}
                  </ZoneListItem>
                );
              })}
            </div>
          ) : null}

          {/* 라인은 부스를 품지 않으므로 따로 나열한다. */}
          {lineShapes.length > 0 ? (
            <div className="flex flex-col gap-1 border-t border-zinc-200 pt-3">
              <p className="body-small-bold text-zinc-950">
                도형 <span className="text-primary">{lineShapes.length}</span>
              </p>
              {lineShapes.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => {
                    setEditingBoothId(null);
                    setSelectedShapeId(shape.id);
                    const anchor = shapeAnchor(shape);
                    kakaoMapRef.current?.panTo(
                      new window.kakao.maps.LatLng(anchor.lat, anchor.lng),
                    );
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-1 py-2 text-left hover:bg-zinc-100",
                    selectedShapeId === shape.id && "bg-primary/10 hover:bg-primary/10",
                  )}
                >
                  <span className="size-4 shrink-0 text-primary [&_svg]:size-4">
                    {shape.kind === "polygon" ? <DimensionsIcon /> : <RulerHorizontalIcon />}
                  </span>
                  <span className="body-small truncate text-zinc-950">{shape.name}</span>
                  <span className="body-caption ml-auto shrink-0 text-zinc-500">
                    {SHAPE_LABEL[shape.kind]}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </MapSidePanel>
      </div>

      <div
        ref={topActionBarRef}
        data-map-tools
        className="absolute top-4 right-4 left-4 flex flex-wrap items-center justify-end gap-2 lg:top-10 lg:right-8 lg:left-auto lg:gap-4"
      >
        <div className="flex items-center gap-2">
          <span
            className="flex"
            title={
              editLockReason ??
              (canUndo ? "실행취소 (Ctrl/⌘+Z)" : "편집 내용이 없어 실행취소할 수 없습니다.")
            }
          >
            <IconButton
              icon={<ResetIcon />}
              size="lg"
              iconClassName="size-5 [&_svg]:size-5"
              aria-label="실행취소"
              disabled={undoDisabled}
              onClick={undo}
              className={undoDisabled ? "text-zinc-500" : "text-zinc-950"}
            />
          </span>
          <span
            className="flex"
            title={
              editLockReason ??
              (canRedo ? "다시실행 (Shift+Ctrl/⌘+Z)" : "편집 내용이 없어 다시실행할 수 없습니다.")
            }
          >
            <IconButton
              icon={<ResetIcon className="-scale-x-100" />}
              size="lg"
              iconClassName="size-5 [&_svg]:size-5"
              aria-label="다시실행"
              disabled={redoDisabled}
              onClick={redo}
              className={redoDisabled ? "text-zinc-500" : "text-zinc-950"}
            />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={replaceFileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) replaceMutation.mutate(file);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={overlayFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) loadOverlayFile(file);
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            icon={<FileIcon />}
            disabled={replaceMutation.isPending || editingLocked}
            title={
              editLockReason ??
              (hasBlueprintImage ? "다른 배치도 이미지로 다시 분석" : "배치도 이미지로 AI 분석")
            }
            onClick={() => setAnalyzeDialogOpen(true)}
          >
            {replaceMutation.isPending ? "올리는 중..." : hasBlueprintImage ? "재분석" : "AI 분석"}
          </Button>
          <Button
            type="button"
            variant="outline"
            icon={<ImageIcon />}
            disabled={editingLocked}
            title={editLockReason ?? "팜플렛 이미지 올리기"}
            onClick={() => overlayFileInputRef.current?.click()}
          >
            팜플렛
          </Button>
          <Button
            type="button"
            variant={hasUnsavedChanges ? "primary" : "outline"}
            disabled={saveMutation.isPending || editingLocked || !hasUnsavedChanges}
            title={saveLockReason}
            onClick={() => setSaveDialogOpen(true)}
          >
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </Button>
          {/*
            공개 여부는 방문객에게 보이는지를 가르는 유일한 신호라 항상 자리를 지킨다.
            공개된 지도도 눌러서 내릴 수 있어야 한다. 상태 표시로만 두면 잘못 그린 채
            공개했을 때 부스를 전부 지우는 것 말고는 감출 방법이 없다.
          */}
          {isPublished ? (
            <button
              type="button"
              className="body-regular-bold flex items-center gap-2 rounded-md border border-primary-300 bg-white px-4 py-2 text-primary hover:bg-zinc-100 disabled:opacity-50"
              title="방문객 앱 부스지도에 보이는 중입니다. 눌러서 공개를 해제합니다."
              disabled={unpublishMutation.isPending}
              onClick={() => setUnpublishDialogOpen(true)}
            >
              <CheckCircledIcon className="size-4 shrink-0" />
              {unpublishMutation.isPending ? "해제 중..." : "공개됨"}
            </button>
          ) : (
            <Button
              type="button"
              variant="primary"
              disabled={publishMutation.isPending || publishLockReason !== null}
              title={publishLockReason ?? "방문객 앱 부스지도에 공개"}
              onClick={() => setPublishDialogOpen(true)}
            >
              {publishMutation.isPending ? "공개 중..." : "공개하기"}
            </Button>
          )}
        </div>
        <IconButton
          icon={<Cross2Icon />}
          size="lg"
          iconClassName="size-5 [&_svg]:size-5"
          aria-label="닫기"
          className="text-zinc-950"
          onClick={() => setCloseDialogOpen(true)}
        />
      </div>

      <div
        ref={mapToolsRef}
        data-map-tools
        className={cn(
          "absolute right-4 bottom-4 flex flex-col items-center gap-5 lg:right-8 lg:bottom-10",
          selectionBarOpen && "bottom-[88px] lg:bottom-[88px]",
        )}
      >
        <div className="flex flex-col gap-1">
          <span
            className="flex"
            title={editLockReason ?? "범위 선택 — 지도를 끌어 안에 든 부스·도형을 모두 고릅니다"}
          >
            <IconButton
              icon={<GroupIcon />}
              size="lg"
              iconClassName="size-5 [&_svg]:size-5"
              aria-label="범위 선택"
              aria-pressed={drawTool === "marquee"}
              disabled={editingLocked}
              className={cn("text-zinc-950", drawTool === "marquee" && "ring-2 ring-primary")}
              onClick={() => {
                setPinTypeMenuOpen(false);
                setDraftPoints([]);
                setDrawTool((tool) => (tool === "marquee" ? "select" : "marquee"));
              }}
            />
          </span>
          <IconButton
            icon={<RadiobuttonIcon />}
            size="lg"
            iconClassName="size-5 [&_svg]:size-5"
            aria-label="핀 추가"
            aria-pressed={drawTool === "pin"}
            disabled={editingLocked}
            className={cn("text-zinc-950", drawTool === "pin" && "ring-2 ring-primary")}
            onClick={() => {
              setDraftPoints([]);
              setPinTypeMenuOpen((open) => !open);
            }}
          />
          {pinTypeMenuOpen ? (
            <div className="absolute right-full bottom-20 mr-2 w-25 rounded-lg border border-zinc-200 bg-white p-2 shadow-md">
              {PIN_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPendingPinType(option.value);
                    setDrawTool("pin");
                    setPinTypeMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 border-b border-zinc-200 py-2 text-left last:border-b-0 hover:bg-zinc-100"
                >
                  <span className="size-4 shrink-0 text-primary [&_svg]:size-4">{option.icon}</span>
                  <span className="body-small text-zinc-950">{option.label}</span>
                </button>
              ))}
            </div>
          ) : null}
          <span
            className="flex"
            title={editLockReason ?? "폴리곤 그리기 — 지도를 눌러 꼭짓점을 찍습니다"}
          >
            <IconButton
              icon={<DimensionsIcon />}
              size="lg"
              iconClassName="size-5 [&_svg]:size-5"
              aria-label="폴리곤 추가"
              aria-pressed={drawTool === "polygon"}
              disabled={editingLocked}
              className={cn("text-zinc-950", drawTool === "polygon" && "ring-2 ring-primary")}
              onClick={() => startShapeTool("polygon")}
            />
          </span>
          <span
            className="flex"
            title={editLockReason ?? "라인 그리기 — 지도를 눌러 꺾은점을 찍습니다"}
          >
            <IconButton
              icon={<RulerHorizontalIcon />}
              size="lg"
              iconClassName="size-5 [&_svg]:size-5"
              aria-label="라인 추가"
              aria-pressed={drawTool === "line"}
              disabled={editingLocked}
              className={cn("text-zinc-950", drawTool === "line" && "ring-2 ring-primary")}
              onClick={() => startShapeTool("line")}
            />
          </span>
          <span
            className="flex"
            title={editLockReason ?? "부지 경계 — 지도를 눌러 꼭짓점을 찍습니다"}
          >
            <IconButton
              icon={<CornersIcon />}
              size="lg"
              iconClassName="size-5 [&_svg]:size-5"
              aria-label="부지 경계"
              aria-pressed={drawTool === "boundary"}
              disabled={editingLocked}
              className={cn("text-zinc-950", drawTool === "boundary" && "ring-2 ring-primary")}
              onClick={() => {
                setDrawTool((tool) => (tool === "boundary" ? "select" : "boundary"));
                setPinTypeMenuOpen(false);
                setDraftPoints([]);
                setQueueDraft([]);
              }}
            />
          </span>
          <span className="flex" title={canEditQueue ? undefined : queueToolDisabledReason}>
            <IconButton
              icon={<ClockIcon />}
              size="lg"
              iconClassName="size-5 [&_svg]:size-5"
              aria-label="대기줄 추가"
              aria-pressed={drawTool === "queue-line"}
              disabled={
                !canEditQueue ||
                editingLocked ||
                queuePlanBusy ||
                !selectedPlanQuery.data ||
                selectedPlanQuery.data.path.length < 2
              }
              className={cn("text-zinc-950", drawTool === "queue-line" && "ring-2 ring-primary")}
              onClick={() => {
                setQueueMode("current");
                setQueueTailOnly(true);
                setQueueDraftRevision(selectedQueue?.observationRevision);
                setDrawTool((tool) => (tool === "queue-line" ? "select" : "queue-line"));
                setPinTypeMenuOpen(false);
                setDraftPoints([]);
                setQueueDraft(
                  selectedQueue?.path?.at(-1) && selectedPlanQuery.data
                    ? [snapToQueuePath(selectedPlanQuery.data.path, selectedQueue.path.at(-1)!)]
                    : [],
                );
                setQueueDraftId(selectedQueue?.queueId ?? null);
              }}
            />
          </span>
        </div>
        <MapZoomControls
          onZoomIn={() => setMapLevel((level) => Math.max(level - 1, MIN_MAP_LEVEL))}
          onZoomOut={() => setMapLevel((level) => Math.min(level + 1, MAX_MAP_LEVEL))}
          zoomInDisabled={mapLevel <= MIN_MAP_LEVEL}
          zoomOutDisabled={mapLevel >= MAX_MAP_LEVEL}
        />
      </div>

      {drawTool === "polygon" || drawTool === "line" ? (
        <div className="pointer-events-auto absolute right-16 bottom-4 left-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-md lg:right-28 lg:bottom-10 lg:left-[23rem]">
          <p className="body-small text-zinc-950">
            지도를 눌러 {SHAPE_LABEL[drawTool]} 꼭짓점을 찍으세요
            <span className="body-small-bold ml-2 text-primary">
              {draftPoints.length}개 / 최소 {SHAPE_MINIMUM_POINTS[drawTool]}개
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={draftPoints.length === 0}
            onClick={undoDraftPoint}
          >
            한 점 취소
          </Button>
          <Button type="button" variant="outline" onClick={cancelDraftShape}>
            그만두기
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={draftPoints.length < SHAPE_MINIMUM_POINTS[drawTool]}
            onClick={finishDraftShape}
          >
            그리기 완료
          </Button>
        </div>
      ) : null}

      {drawTool === "boundary" ? (
        <div className="pointer-events-auto absolute right-16 bottom-4 left-4 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2 shadow-md lg:right-28 lg:bottom-10 lg:left-[23rem]">
          <Button type="button" variant="outline" onClick={cancelDraftShape}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={finishBoundary}>
            경계 완료
          </Button>
          {siteBoundary ? (
            <Button type="button" variant="destructive" onClick={() => setDeleteBoundaryOpen(true)}>
              경계 삭제
            </Button>
          ) : null}
        </div>
      ) : null}

      {drawTool === "select" &&
      boothQueueActions &&
      (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || mapError || mapLoading) ? (
        <div
          data-map-tools
          className="pointer-events-auto absolute right-16 bottom-4 left-4 rounded-lg border border-zinc-200 bg-white p-3 shadow-md lg:right-28 lg:bottom-10 lg:left-[23rem]"
        >
          {boothQueueActions}
        </div>
      ) : null}
      {drawTool === "queue-line" ? (
        <div className="pointer-events-auto absolute right-16 bottom-4 left-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-md lg:right-28 lg:bottom-10 lg:left-[23rem]">
          {queueMode === "plan" && selectedOpsBoothId != null && selectedBooth ? (
            <QueuePlanPanel
              key={`${mapQuery.data?.mapId}-${selectedOpsBoothId}`}
              festivalId={festivalId}
              boothId={selectedOpsBoothId}
              boothName={selectedBooth.name}
              nodeVersion={
                editorQuery.data?.nodes.find((node) => node.nodeId === selectedBooth.nodeId)
                  ?.version
              }
              boundaryAvailable={Boolean(siteBoundary && siteBoundary.length >= 3)}
              path={queueDraft}
              onPathChange={setQueueDraft}
              onBusyChange={setQueuePlanBusy}
              onClose={cancelDraftShape}
              locked={editingLocked || hasUnsavedChanges || !canPlanQueue}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="body-small text-zinc-950">
                  {selectedBooth ? (
                    <>
                      <span className="body-small-bold">{selectedBooth.name}</span> ·{" "}
                    </>
                  ) : null}
                  {queueTailOnly
                    ? "지도를 눌러 현재 줄 끝을 찍으세요. 사전 경로 위로 맞춰집니다"
                    : "지도를 눌러 현재 줄이 꺾이는 지점을 찍으세요"}
                  <span className="body-small-bold ml-2 text-primary">
                    {selectedQueue?.waitMinutes != null
                      ? `현재 대기 ${selectedQueue.waitMinutes}분`
                      : "아직 미관측"}
                  </span>
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={cancelDraftShape}>
                    그만두기
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={
                      queueDraft.length < (queueTailOnly ? 1 : 2) ||
                      queueSaveMutation.isPending ||
                      !queueDraft.every(
                        (p) =>
                          Number.isFinite(p.lat) &&
                          Number.isFinite(p.lng) &&
                          Math.abs(p.lat) <= 90 &&
                          Math.abs(p.lng) <= 180,
                      ) ||
                      selectedQueue?.queueId !== queueDraftId
                    }
                    onClick={() => queueSaveMutation.mutate(queueDraft)}
                  >
                    {queueSaveMutation.isPending ? "저장 중..." : "대기줄 저장"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 border-t border-zinc-200 pt-3">
                {/*
                  지도에 그려 둔 라인(통로·대기 라인)을 초안으로 옮긴다. 자동으로 승격하지
                  않는 이유는 지도 노드와 운영 대기줄이 다른 데이터이기 때문이다.
                */}
                {lineShapes.length > 0 ? (
                  <div className="relative">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      selected={queueImportOpen}
                      onClick={() => setQueueImportOpen((open) => !open)}
                    >
                      참고선 가져오기
                    </Button>
                    {queueImportOpen ? (
                      <div className="absolute bottom-full left-0 z-10 mb-2 w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-md">
                        {lineShapes.map((shape) => (
                          <button
                            key={shape.id}
                            type="button"
                            onClick={() => importQueueDraftFrom(shape)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-zinc-100"
                          >
                            <span className="body-small truncate text-zinc-950">{shape.name}</span>
                            <span className="body-caption ml-auto shrink-0 text-zinc-500">
                              점 {shape.points.length}개
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {queueDraft.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    selected={showQueueCoordinates}
                    aria-expanded={showQueueCoordinates}
                    onClick={() => setShowQueueCoordinates((open) => !open)}
                  >
                    좌표 직접 입력
                  </Button>
                ) : null}
                {/* 이미 저장된 경로가 있을 때만. 서버에는 빈 배열이 곧 삭제다. */}
                {selectedQueue?.path && selectedQueue.path.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-error"
                    disabled={queueSaveMutation.isPending}
                    onClick={() => setClearQueuePathOpen(true)}
                  >
                    경로 지우기
                  </Button>
                ) : null}
              </div>
              {showQueueCoordinates && !queueTailOnly ? (
                <QueuePointEditor
                  path={queueDraft}
                  onChange={setQueueDraft}
                  locked={
                    editingLocked ||
                    queueSaveMutation.isPending ||
                    selectedQueue?.queueId !== queueDraftId
                  }
                />
              ) : null}
              {showQueueCoordinates && queueTailOnly && queueDraft.length === 1 ? (
                <QueuePointEditor
                  path={queueDraft}
                  onChange={(points) => {
                    if (!points.length) setQueueDraft([]);
                    else if (
                      selectedPlanQuery.data &&
                      Number.isFinite(points[0].lat) &&
                      Number.isFinite(points[0].lng)
                    )
                      setQueueDraft([snapToQueuePath(selectedPlanQuery.data.path, points[0])]);
                  }}
                  locked={queueSaveMutation.isPending}
                />
              ) : null}
              {queueSaveError ? <p className="body-caption text-error">{queueSaveError}</p> : null}
            </div>
          )}
        </div>
      ) : null}

      {pamphlet ? (
        <div className="absolute top-28 left-4 w-72 rounded-lg bg-white p-4 shadow-md lg:top-10 lg:left-[23rem]">
          <p className="body-small-bold text-zinc-950">팜플렛 배치</p>
          <div className="mt-3 flex items-center gap-3 rounded-md border border-zinc-200 p-2">
            {/* 서명 URL이라 next/image 최적화 대상이 아니다. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pamphlet.imageUrl}
              alt=""
              className="size-12 shrink-0 rounded-sm border border-zinc-200 object-cover"
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="body-small-bold truncate text-zinc-950" title={pamphletFileName}>
                {pamphletFileName ?? "저장된 팜플렛 이미지"}
              </p>
              <p className="body-caption text-zinc-500">
                {pamphlet.imageWidth}×{pamphlet.imageHeight}px
              </p>
              {pamphletStatus ? <PamphletStatusLabel status={pamphletStatus} /> : null}
            </div>
          </div>
          <p className="body-caption mt-2 text-zinc-500">
            이미지만 움직이며 부스 좌표는 유지됩니다.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => {
              const center = kakaoMap?.getCenter();
              if (center)
                updatePamphletAnchor({
                  centerLatitude: center.getLat(),
                  centerLongitude: center.getLng(),
                });
            }}
          >
            현재 지도 중심으로 이동
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-2 w-full"
            onClick={() => setRemovePamphletOpen(true)}
          >
            팜플렛 제거
          </Button>
          <label className="body-caption mt-3 flex flex-col gap-1 text-zinc-950">
            폭(m)
            <input
              type="number"
              min={10}
              max={100000}
              value={pamphlet.anchor.groundWidthMeters}
              onChange={(event) =>
                updatePamphletAnchor({ groundWidthMeters: Number(event.target.value) })
              }
              className="body-small rounded-md border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="body-caption mt-2 flex flex-col gap-1 text-zinc-950">
            회전(도)
            <input
              type="number"
              value={pamphlet.anchor.rotationDegrees}
              onChange={(event) =>
                updatePamphletAnchor({ rotationDegrees: Number(event.target.value) })
              }
              className="body-small rounded-md border border-zinc-200 px-2 py-1"
            />
          </label>
          <label className="body-caption mt-2 flex flex-col gap-1 text-zinc-950">
            투명도
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={pamphlet.opacity}
              onChange={(event) => updatePamphletAnchor({ opacity: Number(event.target.value) })}
            />
          </label>
          <label className="body-caption mt-2 flex items-center gap-2 text-zinc-950">
            <input
              type="checkbox"
              checked={pamphlet.visible}
              onChange={(event) => updatePamphletAnchor({ visible: event.target.checked })}
            />
            표시
          </label>
          <label className="body-caption mt-1 flex items-center gap-2 text-zinc-950">
            <input
              type="checkbox"
              checked={pamphlet.clipToBoundary}
              disabled={!siteBoundary}
              onChange={(event) => updatePamphletAnchor({ clipToBoundary: event.target.checked })}
            />
            경계로 자르기
          </label>
        </div>
      ) : null}

      {/*
        고른 것이 있으면 화면 맨 아래에 액션 바를 띄운다. 예전에는 「그룹화」가 왼쪽 부스
        목록 안에 있어, 목록을 접어 둔 좁은 화면에서는 지도에서 골라 놓고도 묶을 방법이
        보이지 않았다.
      */}
      {selectionBarOpen ? (
        <div data-map-tools>
          <BoothSelectionBar
            boothCount={checkedBooths.length}
            shapeCount={checkedShapes.length}
            groupableCount={groupableBooths.length}
            zones={zoneOptions}
            canUngroup={checkedInAnyZone}
            onGroup={() => setGroupPopoverOpen(true)}
            onAssignZone={assignCheckedToZone}
            onUngroup={ungroupChecked}
            onLineUp={lineUpChecked}
            onClear={() => {
              setCheckedIds(new Set());
              setEditingBoothId(null);
              setSelectedShapeId(null);
            }}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={clearQueuePathOpen}
        onOpenChange={setClearQueuePathOpen}
        title="대기줄 경로를 지우시겠습니까?"
        description="지도에서 줄이 사라집니다. 줄끝 위치와 대기시간은 그대로 남습니다."
        cancelLabel="취소"
        confirmLabel="지우기"
        confirmVariant="destructive"
        confirmPending={queueSaveMutation.isPending}
        onConfirm={() => {
          setClearQueuePathOpen(false);
          queueSaveMutation.mutate([]);
        }}
      />
      <ConfirmDialog
        open={removePamphletOpen}
        onOpenChange={setRemovePamphletOpen}
        title="팜플렛을 제거하시겠습니까?"
        description={
          serverHasOverlay
            ? "저장하면 서버에 올라간 팜플렛도 지도에서 내려갑니다."
            : "아직 저장하지 않은 팜플렛이라 바로 사라집니다."
        }
        cancelLabel="취소"
        confirmLabel="제거"
        confirmVariant="destructive"
        onConfirm={() => {
          setRemovePamphletOpen(false);
          setPamphlet((current) => {
            // 로컬에서 고른 이미지면 만들어 둔 objectURL도 함께 반납한다.
            if (current?.localObjectUrl) {
              localImageFiles.current.delete(current.localObjectUrl);
              URL.revokeObjectURL(current.localObjectUrl);
            }
            return null;
          });
        }}
      />
      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="저장하시겠습니까?"
        description={
          pamphlet?.localObjectUrl && !pamphlet.assetId
            ? "팜플렛 업로드 후 지도 설정을 저장합니다. 설정 저장이 실패해도 업로드된 이미지는 서버에 남을 수 있습니다."
            : undefined
        }
        confirmLabel="저장"
        confirmVariant="primary"
        confirmPending={saveMutation.isPending}
        onConfirm={() => {
          setSaveDialogOpen(false);
          saveMutation.mutate();
        }}
      />
      <ConfirmDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title="방문객에게 공개할까요?"
        description="저장된 부스와 구역, 부지 경계와 팜플렛이 방문객 앱 «부스지도»에 그대로 보입니다."
        confirmLabel="공개"
        confirmVariant="primary"
        confirmPending={publishMutation.isPending}
        onConfirm={() => {
          setPublishDialogOpen(false);
          publishMutation.mutate();
        }}
      />
      <ConfirmDialog
        open={unpublishDialogOpen}
        onOpenChange={setUnpublishDialogOpen}
        title="공개를 해제할까요?"
        description="방문객 앱에서 숨겨집니다. 그려 둔 내용은 그대로 남습니다."
        confirmLabel="공개 해제"
        confirmVariant="destructive"
        confirmPending={unpublishMutation.isPending}
        onConfirm={() => {
          setUnpublishDialogOpen(false);
          unpublishMutation.mutate();
        }}
      />
      <ConfirmDialog
        open={analyzeDialogOpen}
        onOpenChange={setAnalyzeDialogOpen}
        title="배치도 이미지로 AI 분석을 시작할까요?"
        description={
          booths.length > 0
            ? `지도를 새로 만들기 때문에 지금 찍혀 있는 핀 ${booths.length}개가 사라집니다. 저장하지 않은 편집도 함께 사라집니다.`
            : "AI가 배치도에서 부스를 찾아 핀으로 뿌려 줍니다. 분석이 끝날 때까지 편집과 저장은 막힙니다."
        }
        confirmLabel="이미지 선택"
        confirmVariant="primary"
        onConfirm={() => {
          setAnalyzeDialogOpen(false);
          replaceFileInputRef.current?.click();
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
      <ConfirmDialog
        open={deleteBoundaryOpen}
        onOpenChange={setDeleteBoundaryOpen}
        title="경계를 삭제하시겠습니까?"
        confirmLabel="삭제"
        confirmVariant="destructive"
        onConfirm={() => {
          setSiteBoundary(null);
          setBoundaryDraft([]);
          setDeleteBoundaryOpen(false);
          setPamphlet((prev) => (prev ? { ...prev, clipToBoundary: false } : prev));
        }}
      />
    </div>
  );
}
