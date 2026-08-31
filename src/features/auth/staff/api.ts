import { staffApiClient } from "@/lib/api/staffApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { StaffLoginRequest, StaffLoginResponse, StaffSession } from "./types";

export async function loginStaff(request: StaffLoginRequest): Promise<StaffLoginResponse> {
  const { data } = await staffApiClient.post<ApiResponse<StaffLoginResponse>>(
    "/field-staff/auth/login",
    request,
  );
  return data.data;
}

export async function getCurrentStaff(): Promise<StaffSession> {
  const { data } = await staffApiClient.get<ApiResponse<StaffSession>>("/field-staff/auth/me");
  return data.data;
}

export async function logoutStaff(): Promise<void> {
  await staffApiClient.post<ApiResponse<void>>("/field-staff/auth/logout");
}
