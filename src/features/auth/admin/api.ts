import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type { AdminLoginRequest, AdminLoginResponse } from "./types";

export async function loginAdmin(request: AdminLoginRequest): Promise<AdminLoginResponse> {
  const { data } = await adminApiClient.post<ApiResponse<AdminLoginResponse>>(
    "/admin/auth/login",
    request,
  );
  return data.data;
}
