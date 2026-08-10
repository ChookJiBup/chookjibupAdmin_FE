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

export async function getSubAdmin(festivalId: string, adminId: string): Promise<SubAdmin> {
  const { data } = await adminApiClient.get<ApiResponse<SubAdmin>>(
    `/festivals/${festivalId}/sub-admins/${adminId}`,
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

export async function assignSubAdmin(festivalId: string, adminId: string): Promise<void> {
  await adminApiClient.post<ApiResponse<void>>(`/festivals/${festivalId}/sub-admins`, { adminId });
}

export async function deleteSubAdmins(festivalId: string, adminIds: string[]): Promise<void> {
  await adminApiClient.delete<ApiResponse<void>>(`/festivals/${festivalId}/sub-admins`, {
    data: { adminIds },
  });
}
