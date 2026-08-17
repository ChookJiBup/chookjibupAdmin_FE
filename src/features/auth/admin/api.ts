import { adminApiClient } from "@/lib/api/adminApiClient";
import type { ApiResponse } from "@/lib/api/types";
import type {
  AdminEmailVerificationConfirmRequest,
  AdminEmailVerificationRequest,
  AdminLoginRequest,
  AdminLoginResponse,
  AdminAccountProfile,
  AdminPasswordResetConfirmRequest,
  AdminSignupRequest,
  AdminSignupResponse,
  UpdateAdminProfileRequest,
} from "./types";

export async function getAdminProfile(): Promise<AdminAccountProfile> {
  const { data } = await adminApiClient.get<ApiResponse<AdminAccountProfile>>("/admin/me");
  return data.data;
}

export async function requestAuthenticatedPasswordReset(): Promise<void> {
  await adminApiClient.post<ApiResponse<void>>("/admin/me/password-reset/request");
}

export async function requestPasswordReset(email: string): Promise<void> {
  await adminApiClient.post<ApiResponse<void>>("/admin/auth/password-reset/request", { email });
}

export async function confirmPasswordReset(
  request: AdminPasswordResetConfirmRequest,
): Promise<void> {
  await adminApiClient.post<ApiResponse<void>>("/admin/auth/password-reset/confirm", request);
}

export async function loginAdmin(request: AdminLoginRequest): Promise<AdminLoginResponse> {
  const { data } = await adminApiClient.post<ApiResponse<AdminLoginResponse>>(
    "/admin/auth/login",
    request,
  );
  return data.data;
}

export async function logoutAdmin(): Promise<void> {
  await adminApiClient.post<ApiResponse<void>>("/admin/auth/logout");
}

export async function updateAdminProfile(request: UpdateAdminProfileRequest): Promise<void> {
  await adminApiClient.patch<ApiResponse<void>>("/admin/me", request);
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

export async function withdrawAdmin(): Promise<void> {
  await adminApiClient.patch<ApiResponse<void>>("/admin/me/withdrawal");
}
