import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { FestivalCongestion, FestivalDashboard, FestivalOperationSuggestions } from "./types";

export async function getFestivalDashboard(festivalId: string): Promise<FestivalDashboard> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalDashboard>>(
    `/festivals/${festivalId}/dashboard`,
  );
  return data.data;
}

export async function getFestivalCongestion(festivalId: string): Promise<FestivalCongestion> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalCongestion>>(
    `/festivals/${festivalId}/operations/congestion`,
  );
  return data.data;
}

export async function getFestivalOperationSuggestions(
  festivalId: string,
): Promise<FestivalOperationSuggestions> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalOperationSuggestions>>(
    `/festivals/${festivalId}/operations/suggestions`,
  );
  return data.data;
}
