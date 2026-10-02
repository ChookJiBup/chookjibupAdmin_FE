import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  FestivalReportGenerateResult,
  FestivalReportEvaluation,
  FestivalReportPerformance,
  FestivalReportStatus,
  FestivalReportSummary,
  FestivalVisitorCounts,
} from "./types";

export async function getFestivalReportSummary(festivalId: string): Promise<FestivalReportSummary> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalReportSummary>>(
    `/festivals/${festivalId}/reports/summary`,
  );
  return data.data;
}

export async function getFestivalReportPerformance(
  festivalId: string,
): Promise<FestivalReportPerformance> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalReportPerformance>>(
    `/festivals/${festivalId}/reports/performance`,
  );
  return data.data;
}

export async function getFestivalReportEvaluation(
  festivalId: string,
): Promise<FestivalReportEvaluation> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalReportEvaluation>>(
    `/festivals/${festivalId}/reports/evaluation`,
  );
  return data.data;
}

export async function getFestivalVisitorCounts(festivalId: string): Promise<FestivalVisitorCounts> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalVisitorCounts>>(
    `/festivals/${festivalId}/operations/visitors`,
  );
  return data.data;
}
export async function updateDailyVisitorCount(
  festivalId: string,
  visitDate: string,
  visitorCount: number,
): Promise<void> {
  await adminApiClient.put(`/festivals/${festivalId}/operations/visitors/daily/${visitDate}`, {
    visitorCount,
  });
}
export async function updateTotalVisitorCount(
  festivalId: string,
  visitorCount: number,
): Promise<void> {
  await adminApiClient.put(`/festivals/${festivalId}/operations/visitors/total`, { visitorCount });
}
export async function getFestivalReportStatus(festivalId: string): Promise<FestivalReportStatus> {
  const { data } = await adminApiClient.get<ApiResponse<FestivalReportStatus>>(
    `/festivals/${festivalId}/reports/status`,
  );
  return data.data;
}
export async function generateFestivalReport(
  festivalId: string,
): Promise<FestivalReportGenerateResult> {
  const { data } = await adminApiClient.post<ApiResponse<FestivalReportGenerateResult>>(
    `/festivals/${festivalId}/reports/generate`,
  );
  return data.data;
}
