import { useEffect, useState } from "react";
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
  setSession: (accessToken: string, tokenType: string, expiresIn: number, admin: AdminSummary) => void;
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
  // zustand persist는 브라우저에서만 storage를 붙인다 (SSR에서는 `.persist` 자체가 없다).
  // 그래서 초기값은 useState 초기화식이 아니라 useEffect 안에서만 읽어야 한다.
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(useAdminAuthStore.persist.hasHydrated());
    const unsubscribe = useAdminAuthStore.persist.onFinishHydration(() => setHasHydrated(true));
    return unsubscribe;
  }, []);

  return hasHydrated;
}
