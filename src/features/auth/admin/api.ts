import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  AdminEmailVerificationConfirmRequest,
  AdminEmailVerificationRequest,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminSignupRequest,
  AdminSignupResponse,
} from "./types";

export async function loginAdmin(request: AdminLoginRequest): Promise<AdminLoginResponse> {
  const { data } = await adminApiClient.post<ApiResponse<AdminLoginResponse>>(
    "/admin/auth/login",
    request,
  );
  return data.data;
}

export async function requestEmailVerification(
  request: AdminEmailVerificationRequest,
): Promise<void> {
  await adminApiClient.post<ApiResponse<void>>("/admin/auth/email-verification/request", request);
}

export async function confirmEmailVerification(
  request: AdminEmailVerificationConfirmRequest,
): Promise<void> {
  await adminApiClient.post<ApiResponse<void>>("/admin/auth/email-verification/confirm", request);
}

export async function signupAdmin(request: AdminSignupRequest): Promise<AdminSignupResponse> {
  const { data } = await adminApiClient.post<ApiResponse<AdminSignupResponse>>(
    "/admin/auth/signup",
    request,
  );
  return data.data;
}
