import axios from "axios";
import { useAdminAuthStore } from "@/store/adminAuthStore";

// 백엔드가 /api/admin, /api/festivals, /api/field-staff를 같은 관리자 JWT로 인증하므로
// baseURL은 공통 루트로 두고, 각 API 함수가 나머지 경로를 명시한다.
export const adminApiClient = axios.create({
  baseURL: "/api",
});

adminApiClient.interceptors.request.use((config) => {
  const session = useAdminAuthStore.getState().session;
  if (session) {
    config.headers.Authorization = `${session.tokenType} ${session.accessToken}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAdminAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);
