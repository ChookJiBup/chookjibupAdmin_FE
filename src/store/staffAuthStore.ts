import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StaffSession {
  accessToken: string;
  tokenType: string;
  /** 토큰 만료 시각 (epoch ms) */
  expiresAt: number;
  staffId: string;
  festivalId: string;
  loginId: string;
  name: string;
}

interface StaffAuthState {
  session: StaffSession | null;
  setSession: (session: Omit<StaffSession, "expiresAt"> & { expiresIn: number }) => void;
  clearSession: () => void;
  isSessionValid: () => boolean;
}

export const useStaffAuthStore = create<StaffAuthState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: ({ expiresIn, ...rest }) =>
        set({
          session: {
            ...rest,
            expiresAt: Date.now() + expiresIn * 1000,
          },
        }),
      clearSession: () => set({ session: null }),
      isSessionValid: () => {
        const { session } = get();
        return session !== null && session.expiresAt > Date.now();
      },
    }),
    { name: "chookjibup-staff-auth" },
  ),
);

/** @see useAdminAuthHasHydrated */
export function useStaffAuthHasHydrated(): boolean {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(useStaffAuthStore.persist.hasHydrated());
    const unsubscribe = useStaffAuthStore.persist.onFinishHydration(() => setHasHydrated(true));
    return unsubscribe;
  }, []);

  return hasHydrated;
}
