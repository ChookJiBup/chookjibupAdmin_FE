import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { FestivalQueueList } from "@/features/staffMap/types";
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

export async function getFestivalQueues(festivalId: string): Promise<FestivalQueueList> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalQueueList>>(
    `/festivals/${festivalId}/operations/queues`,
  );
  return data.data;
}
