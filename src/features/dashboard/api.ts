import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { FestivalDashboard } from "./types";

export async function getFestivalDashboard(festivalId: string): Promise<FestivalDashboard> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalDashboard>>(
    `/festivals/${festivalId}/dashboard`,
  );
  return data.data;
}
