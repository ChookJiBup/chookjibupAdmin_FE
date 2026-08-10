import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  CreateFieldStaffRequest,
  CreateFieldStaffResult,
  FieldStaff,
  ReissueFieldStaffPasswordResponse,
  UpdateFieldStaffRequest,
} from "./types";

export async function getFieldStaffList(
  festivalId: string,
  keyword?: string,
): Promise<FieldStaff[]> {
  const { data } = await adminApiClient.get<ApiResponse<FieldStaff[]>>(
    `/festivals/${festivalId}/field-staff`,
    { params: keyword ? { keyword } : undefined },
  );
  return data.data;
}

export async function getFieldStaff(festivalId: string, staffId: string): Promise<FieldStaff> {
  const { data } = await adminApiClient.get<ApiResponse<FieldStaff>>(
    `/festivals/${festivalId}/field-staff/${staffId}`,
  );
  return data.data;
}

export async function createFieldStaff(
  festivalId: string,
  request: CreateFieldStaffRequest,
): Promise<CreateFieldStaffResult> {
  const { data } = await adminApiClient.post<ApiResponse<CreateFieldStaffResult>>(
    `/festivals/${festivalId}/field-staff`,
    request,
  );
  return data.data;
}

export async function deleteFieldStaff(festivalId: string, staffId: string): Promise<void> {
  await adminApiClient.delete<ApiResponse<void>>(`/festivals/${festivalId}/field-staff/${staffId}`);
}

export async function deleteFieldStaffBulk(festivalId: string, staffIds: string[]): Promise<void> {
  await adminApiClient.delete<ApiResponse<void>>(`/festivals/${festivalId}/field-staff`, {
    data: { staffIds },
  });
}

export async function updateFieldStaff(
  festivalId: string,
  staffId: string,
  request: UpdateFieldStaffRequest,
): Promise<void> {
  await adminApiClient.patch<ApiResponse<void>>(
    `/festivals/${festivalId}/field-staff/${staffId}`,
    request,
  );
}

export async function updateFieldStaffStatus(
  festivalId: string,
  staffId: string,
  active: boolean,
): Promise<void> {
  await adminApiClient.patch<ApiResponse<void>>(
    `/festivals/${festivalId}/field-staff/${staffId}/status`,
    { active },
  );
}

export async function reissueFieldStaffPassword(
  festivalId: string,
  staffId: string,
): Promise<ReissueFieldStaffPasswordResponse> {
  const { data } = await adminApiClient.post<ApiResponse<ReissueFieldStaffPasswordResponse>>(
    `/festivals/${festivalId}/field-staff/${staffId}/password/reissue`,
  );
  return data.data;
}
