import axios from "axios";
import { useAdminAuthStore } from "@/store/adminAuthStore";

export const adminApiClient = axios.create({
  baseURL: "/api/admin",
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
