import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { FestivalReportSummary } from "./types";

export async function getFestivalReportSummary(festivalId: string): Promise<FestivalReportSummary> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalReportSummary>>(
    `/festivals/${festivalId}/reports/summary`,
  );
  return data.data;
}
