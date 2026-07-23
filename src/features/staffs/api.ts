import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { CreateFieldStaffRequest, CreateFieldStaffResult, FieldStaff } from "./types";

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
