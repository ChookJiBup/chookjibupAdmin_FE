"use client";

import { useRouter } from "next/navigation";
import { useStaffAuthStore } from "@/store/staffAuthStore";

export function StaffLogoutButton() {
  const router = useRouter();
  const clearSession = useStaffAuthStore((state) => state.clearSession);

  return (
    <button
      type="button"
      onClick={() => {
        clearSession();
        router.replace("/staff/login");
      }}
    >
      로그아웃
    </button>
  );
}
