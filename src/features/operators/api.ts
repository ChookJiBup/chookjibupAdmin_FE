import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { SubAdmin, SubAdminCandidate } from "./types";

export async function getSubAdmins(festivalId: string, keyword?: string): Promise<SubAdmin[]> {
  const { data } = await adminApiClient.get<ApiResponse<SubAdmin[]>>(
    `/festivals/${festivalId}/sub-admins`,
    { params: keyword ? { keyword } : undefined },
  );
  return data.data;
}

export async function searchSubAdminCandidates(
  festivalId: string,
  keyword: string,
): Promise<SubAdminCandidate[]> {
  const { data } = await adminApiClient.get<ApiResponse<SubAdminCandidate[]>>(
    `/festivals/${festivalId}/sub-admin-candidates`,
    { params: { keyword } },
  );
  return data.data;
}
