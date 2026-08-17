import type { NodeChangeRequest, NodeResponse } from "./types";

/** 카카오맵 위에 표시하는 부스 핀(로컬 UI 상태). */
export interface LocalBoothPin {
  id: string;
  nodeId: string | null;
  name: string;
  lat: number;
  lng: number;
  uncertain?: boolean;
}

/** schema 2.0 POINT 노드만 카카오 핀으로 변환한다. 1.0(이미지 정규화)은 null. */
export function nodeToLocalBooth(node: NodeResponse): LocalBoothPin | null {
  if (node.geometrySchemaVersion === "1.0") {
    return null;
  }
  if (node.geometryType !== "POINT") {
    return null;
  }
  const lat = node.geometry.lat;
  const lng = node.geometry.lng;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return null;
  }
  return {
    id: `node-${node.nodeId}`,
    nodeId: node.nodeId,
    name: node.name,
    lat,
    lng,
    uncertain: node.reviewStatus === "REVIEW_REQUIRED",
  };
}

export function boothMapPinsToNodeChanges(
  booths: LocalBoothPin[],
  deletedNodeIds: string[],
): NodeChangeRequest[] {
  const changes: NodeChangeRequest[] = booths.map((booth, index) => ({
    nodeId: booth.nodeId,
    nodeType: "BOOTH",
    name: booth.name,
    geometryType: "POINT",
    geometry: { lat: booth.lat, lng: booth.lng },
    deleted: false,
    sortOrder: index,
  }));

  for (const nodeId of deletedNodeIds) {
    changes.push({
      nodeId,
      nodeType: "BOOTH",
      name: "",
      geometryType: "POINT",
      geometry: { lat: 0, lng: 0 },
      deleted: true,
      sortOrder: 0,
    });
  }

  return changes;
}
