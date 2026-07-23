import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminSummary } from "@/features/auth/admin/types";

interface AdminSession {
  accessToken: string;
  tokenType: string;
  /** 토큰 만료 시각 (epoch ms) */
  expiresAt: number;
  admin: AdminSummary;
}

interface AdminAuthState {
  session: AdminSession | null;
  setSession: (
    accessToken: string,
    tokenType: string,
    expiresIn: number,
    admin: AdminSummary,
  ) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (accessToken, tokenType, expiresIn, admin) =>
        set({
          session: {
            accessToken,
            tokenType,
            expiresAt: Date.now() + expiresIn * 1000,
            admin,
          },
        }),
      clearSession: () => set({ session: null }),
      isSessionValid: () => {
        const { session } = get();
        return session !== null && session.expiresAt > Date.now();
      },
    }),
    { name: "chookjibup-admin-auth" },
  ),
);

/**
 * localStorage에서 세션을 복원하는 zustand persist rehydration이 끝났는지 추적한다.
 * 이게 끝나기 전에 isSessionValid를 판단하면 로그인된 사용자도 새로고침 시
 * 순간적으로 미인증 상태로 보여 로그인 화면으로 잘못 리다이렉트될 수 있다.
 */
export function useAdminAuthHasHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useAdminAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAdminAuthStore.persist.hasHydrated(),
    // 서버에서는 storage가 없어 항상 hydrate되지 않은 상태로 취급한다.
    () => false,
  );
}
