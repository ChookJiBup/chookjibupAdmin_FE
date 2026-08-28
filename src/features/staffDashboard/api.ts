import type { FestivalDashboard } from "@/features/dashboard/types";
import { staffApiClient } from "@/lib/api/staffApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { BoothCongestionResponse, UpdateBoothCongestionRequest } from "./types";

export async function getStaffDashboard(festivalId: string): Promise<FestivalDashboard> {
  const { data } = await staffApiClient.get<ApiResponse<FestivalDashboard>>(
    `/api/festivals/${festivalId}/dashboard`,
  );
  return data.data;
}

export async function updateBoothCongestion(
  festivalId: string,
  boothId: number,
  request: UpdateBoothCongestionRequest,
): Promise<BoothCongestionResponse> {
  const { data } = await staffApiClient.put<ApiResponse<BoothCongestionResponse>>(
    `/api/festivals/${festivalId}/booths/${boothId}/congestion`,
    request,
  );
  return data.data;
}
