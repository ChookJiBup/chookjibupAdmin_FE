import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  FestivalMapReadUrlResponse,
  FestivalMapSummary,
  MapAnalysisStatusResponse,
  MapEditorResponse,
  SaveRoadmapDraftRequest,
  SaveRoadmapDraftResponse,
} from "./types";

export async function getMapAnalysisStatus(
  festivalId: string,
  mapId: string,
): Promise<MapAnalysisStatusResponse> {
  const { data } = await adminApiClient.get<ApiResponse<MapAnalysisStatusResponse>>(
    `/festivals/${festivalId}/maps/${mapId}/analysis`,
  );
  return data.data;
}

export async function getMapEditor(festivalId: string, mapId: string): Promise<MapEditorResponse> {
  const { data } = await adminApiClient.get<ApiResponse<MapEditorResponse>>(
    `/festivals/${festivalId}/maps/${mapId}/editor`,
  );
  return data.data;
}

export async function saveMapEditor(
  festivalId: string,
  mapId: string,
  request: SaveRoadmapDraftRequest,
): Promise<SaveRoadmapDraftResponse> {
  const { data } = await adminApiClient.put<ApiResponse<SaveRoadmapDraftResponse>>(
    `/festivals/${festivalId}/maps/${mapId}/editor`,
    request,
  );
  return data.data;
}

export async function getMapReadUrl(
  festivalId: string,
  mapId: string,
): Promise<FestivalMapReadUrlResponse> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalMapReadUrlResponse>>(
    `/festivals/${festivalId}/maps/${mapId}/read-url`,
  );
  return data.data;
}

export async function replaceFestivalMap(
  festivalId: string,
  mapId: string,
  image: File,
  mapName?: string,
): Promise<FestivalMapSummary> {
  const form = new FormData();
  if (mapName) form.append("mapName", mapName);
  form.append("image", image);
  const { data } = await adminApiClient.post<ApiResponse<FestivalMapSummary>>(
    `/festivals/${festivalId}/maps/${mapId}/replacement`,
    form,
  );
  return data.data;
}

export async function deleteFestivalMap(festivalId: string, mapId: string): Promise<void> {
  await adminApiClient.delete<ApiResponse<void>>(`/festivals/${festivalId}/maps/${mapId}`);
}
