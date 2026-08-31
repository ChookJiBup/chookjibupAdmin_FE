import { create } from "zustand";
import type { StaffSession } from "@/features/auth/staff/types";

interface StaffAuthState {
  session: StaffSession | null;
  setSession: (session: StaffSession) => void;
  clearSession: () => void;
}

/** API 쿠키 세션에서 복구한 화면 표시용 상태이며 브라우저 저장소에는 기록하지 않는다. */
export const useStaffAuthStore = create<StaffAuthState>()((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
