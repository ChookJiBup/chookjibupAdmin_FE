import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { RegisterOperatorRequest, RegisterOperatorResult, SubAdmin } from "./types";

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

export async function registerOperator(
  festivalId: string,
  request: RegisterOperatorRequest,
): Promise<RegisterOperatorResult> {
  const { data } = await adminApiClient.post<ApiResponse<RegisterOperatorResult>>(
    `/festivals/${festivalId}/operators`,
    request,
  );
  return data.data;
}

export async function deleteSubAdmins(festivalId: string, adminIds: string[]): Promise<void> {
  await adminApiClient.delete<ApiResponse<void>>(`/festivals/${festivalId}/sub-admins`, {
    data: { adminIds },
  });
}
