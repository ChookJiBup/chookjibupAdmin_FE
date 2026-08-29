import { create } from "zustand";
import type { AdminAccountProfile, AdminSummary } from "@/features/auth/admin/types";

interface AdminSession {
  admin: AdminSummary;
}

interface AdminAuthState {
  session: AdminSession | null;
  setSession: (expiresIn: number, admin: AdminSummary) => void;
  setProfile: (profile: AdminAccountProfile) => void;
  updateAdminProfile: (patch: Partial<AdminSummary>) => void;
  clearSession: () => void;
}

function profileToSummary(profile: AdminAccountProfile): AdminSummary {
  return {
    ...profile,
    festivalId: null,
    role: null,
    canInviteSubAdmin: false,
    canModifyFestivalInfo: false,
    canViewOperationReport: false,
    canUpdateQueueTail: false,
  };
}

/** HttpOnly 쿠키 인증 결과의 화면 표시용 메모리 상태. 브라우저 저장소에는 기록하지 않는다. */
export const useAdminAuthStore = create<AdminAuthState>()((set) => ({
  session: null,
  setSession: (_expiresIn, admin) => set({ session: { admin } }),
  setProfile: (profile) => set({ session: { admin: profileToSummary(profile) } }),
  updateAdminProfile: (patch) =>
    set((state) =>
      state.session ? { session: { admin: { ...state.session.admin, ...patch } } } : state,
    ),
  clearSession: () => set({ session: null }),
}));
