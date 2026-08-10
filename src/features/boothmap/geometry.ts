import type {
  BoothMapObject,
  BoothMapQueueLine,
  BoothMapShape,
  BoothMapShapeType,
  NodeChangeRequest,
  NodeResponse,
  PolyGeometry,
  RectangleGeometry,
} from "./types";

const MIN_SIZE = 20;
/** POINT geometry는 캔버스에 사각형 편집 UI가 없어 이 정도 크기의 사각형으로 근사해 보여준다. */
const POINT_APPROXIMATION_RATIO = 0.03;

function isRectangleLike(geometry: Record<string, unknown>): geometry is RectangleGeometry {
  return typeof geometry.x === "number" && typeof geometry.y === "number";
}

function isPolyLike(geometry: Record<string, unknown>): geometry is PolyGeometry {
  return Array.isArray((geometry as PolyGeometry).points);
}

/**
 * 서버 노드(0~1 정규화 geometry) → 캔버스 오브젝트(이미지 픽셀 좌표).
 * geometryType이 POINT/POLYGON이면 이 에디터가 지원하는 사각형/꺾은선으로 근사한다
 * (편집 UI가 아직 점·다각형을 따로 다루지 않는다 — 근사 변환임을 호출부에서 안내해야 한다).
 */
export function nodeToBoothMapObject(
  node: NodeResponse,
  imageWidth: number,
  imageHeight: number,
): BoothMapObject | null {
  const geometry = node.geometry;

  if (node.nodeType === "QUEUE" || node.geometryType === "POLYLINE" || node.geometryType === "POLYGON") {
    if (!isPolyLike(geometry) || geometry.points.length === 0) return null;
    const points = geometry.points.flatMap((point) => [point.x * imageWidth, point.y * imageHeight]);
    const line: BoothMapQueueLine = {
      kind: "line",
      id: `node-${node.nodeId}`,
      nodeId: node.nodeId,
      label: node.name,
      points,
      reviewStatus: node.reviewStatus,
      source: node.source,
    };
    return line;
  }

  if (!isRectangleLike(geometry)) return null;

  const width = "width" in geometry && typeof geometry.width === "number"
    ? geometry.width * imageWidth
    : imageWidth * POINT_APPROXIMATION_RATIO;
  const height = "height" in geometry && typeof geometry.height === "number"
    ? geometry.height * imageHeight
    : imageHeight * POINT_APPROXIMATION_RATIO;

  const shape: BoothMapShape = {
    kind: "shape",
    id: `node-${node.nodeId}`,
    nodeId: node.nodeId,
    type: node.nodeType as BoothMapShapeType,
    label: node.name,
    x: geometry.x * imageWidth,
    y: geometry.y * imageHeight,
    width: Math.max(MIN_SIZE, width),
    height: Math.max(MIN_SIZE, height),
    reviewStatus: node.reviewStatus,
    source: node.source,
  };
  return shape;
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * 캔버스 오브젝트(이미지 픽셀 좌표) → 저장 요청(0~1 정규화 geometry).
 * `deletedNodeIds`에 담긴 서버 노드는 별도의 `deleted: true` 항목으로 추가한다
 * (캔버스 objects 배열에서는 이미 사라져 있어 여기서는 알 수 없기 때문).
 */
export function boothMapObjectsToNodeChanges(
  objects: BoothMapObject[],
  deletedNodeIds: string[],
  imageWidth: number,
  imageHeight: number,
): NodeChangeRequest[] {
  const changes: NodeChangeRequest[] = objects.map((object, index) => {
    if (object.kind === "line") {
      const points: PolyGeometry = {
        points: chunkPoints(object.points).map(([x, y]) => ({
          x: clamp01(x / imageWidth),
          y: clamp01(y / imageHeight),
        })),
      };
      return {
        nodeId: object.nodeId,
        nodeType: "QUEUE",
        name: object.label,
        geometryType: "POLYLINE",
        geometry: points,
        deleted: false,
        sortOrder: index,
      };
    }

    const geometry: RectangleGeometry = {
      x: clamp01(object.x / imageWidth),
      y: clamp01(object.y / imageHeight),
      width: clamp01(object.width / imageWidth),
      height: clamp01(object.height / imageHeight),
    };
    return {
      nodeId: object.nodeId,
      nodeType: object.type,
      name: object.label,
      geometryType: "RECTANGLE",
      geometry,
      deleted: false,
      sortOrder: index,
    };
  });

  const deletions: NodeChangeRequest[] = deletedNodeIds.map((nodeId) => ({
    nodeId,
    nodeType: "OTHER",
    name: "",
    geometryType: "POINT",
    geometry: { x: 0, y: 0 },
    deleted: true,
    sortOrder: 0,
  }));

  return [...changes, ...deletions];
}

function chunkPoints(flat: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pairs.push([flat[i], flat[i + 1]]);
  }
  return pairs;
}
