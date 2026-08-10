import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { FestivalSummary } from "./types";

export async function getManagedFestivals(): Promise<FestivalSummary[]> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalSummary[]>>(
    "/admin/me/managed-festivals",
  );
  return data.data;
}
