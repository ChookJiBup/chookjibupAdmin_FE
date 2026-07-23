import { isAxiosError } from "axios";
import type { ApiErrorBody } from "./types";

/**
 * 백엔드 공통 응답 형식(ApiResponse)에서 사용자에게 보여줄 에러 메시지를 뽑아낸다.
 * 백엔드가 내려주는 메시지가 없으면(네트워크 오류 등) 기본 메시지로 대체한다.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "요청 처리 중 오류가 발생했습니다.",
): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}

export function getApiErrorCode(error: unknown): number | null {
  if (isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.code ?? null;
  }
  return null;
}
