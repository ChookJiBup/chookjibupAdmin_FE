import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { QueuePathPoint } from "@/features/staffMap/types";
import { isAxiosError } from "axios";

export interface QueuePlan {
  planId: string;
  boothId: number;
  path: QueuePathPoint[];
  lengthMeters: number;
  metersPerPerson: number;
  servedPersonsPerMinute: number;
  estimatedCapacity: number;
  revision: number;
  sourceNodeId: string | null;
  nodeVersion: number;
  updatedAt: string;
}
export interface QueuePlanCandidate {
  sourceNodeId: string;
  name: string;
  source: string;
  path: QueuePathPoint[];
  expectedNodeVersion: number;
  expectedRevision: number;
}
export interface QueueRecommendation {
  path: QueuePathPoint[];
  reason: string;
  lengthMeters: number;
  expectedNodeVersion: number;
  expectedRevision: number;
  warnings: string[];
}
const pathFor = (festivalId: string, boothId: number) =>
  `/festivals/${festivalId}/operations/booths/${boothId}/queue-plan`;
export async function deleteQueuePlan(
  festivalId: string,
  boothId: number,
  expectedRevision: number,
  expectedNodeVersion: number,
) {
  const { data } = await adminApiClient.delete<ApiResponse<QueuePlan>>(
    pathFor(festivalId, boothId),
    { data: { expectedRevision, expectedNodeVersion } },
  );
  return data.data;
}

export async function getQueuePlan(festivalId: string, boothId: number): Promise<QueuePlan | null> {
  try {
    const { data } = await adminApiClient.get<ApiResponse<QueuePlan>>(pathFor(festivalId, boothId));
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.code === 40413) return null;
    throw error;
  }
}
export async function getQueueCandidates(festivalId: string, boothId: number) {
  const { data } = await adminApiClient.get<ApiResponse<QueuePlanCandidate[]>>(
    `${pathFor(festivalId, boothId)}/candidates`,
  );
  return data.data;
}
export async function getQueueRecommendationStatus(festivalId: string, boothId: number) {
  const { data } = await adminApiClient.get<
    ApiResponse<{ available: boolean; reason: string | null }>
  >(`${pathFor(festivalId, boothId)}/recommendations/status`);
  return data.data;
}
export async function recommendQueuePlan(
  festivalId: string,
  boothId: number,
  targetCapacity: number,
  metersPerPerson: number,
) {
  const { data } = await adminApiClient.post<ApiResponse<QueueRecommendation>>(
    `${pathFor(festivalId, boothId)}/recommendations`,
    { targetCapacity, metersPerPerson },
    { timeout: 120_000 },
  );
  return data.data;
}
export async function saveQueuePlan(
  festivalId: string,
  boothId: number,
  request: {
    path: QueuePathPoint[];
    metersPerPerson: number;
    servedPersonsPerMinute: number;
    sourceNodeId: string | null;
    expectedRevision: number;
    expectedNodeVersion: number;
  },
) {
  const { data } = await adminApiClient.put<ApiResponse<QueuePlan>>(
    pathFor(festivalId, boothId),
    request,
  );
  return data.data;
}
