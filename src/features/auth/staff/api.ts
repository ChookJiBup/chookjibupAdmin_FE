import { staffApiClient } from "@/lib/api/staffApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { StaffLoginRequest, StaffLoginResponse } from "./types";

export async function loginStaff(request: StaffLoginRequest): Promise<StaffLoginResponse> {
  const { data } = await staffApiClient.post<ApiResponse<StaffLoginResponse>>(
    "/field-staff/auth/login",
    request,
  );
  return data.data;
}
