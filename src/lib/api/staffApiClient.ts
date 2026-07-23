import axios from "axios";
import { useStaffAuthStore } from "@/store/staffAuthStore";

export const staffApiClient = axios.create({
  baseURL: "/api/field-staff",
});

staffApiClient.interceptors.request.use((config) => {
  const session = useStaffAuthStore.getState().session;
  if (session) {
    config.headers.Authorization = `${session.tokenType} ${session.accessToken}`;
  }
  return config;
});

staffApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useStaffAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);
