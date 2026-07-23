"use client";

import { useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/adminAuthStore";

export function AdminLogoutButton() {
  const router = useRouter();
  const clearSession = useAdminAuthStore((state) => state.clearSession);

  return (
    <button
      type="button"
      onClick={() => {
        clearSession();
        router.replace("/login");
      }}
      className="text-left"
    >
      로그아웃
    </button>
  );
}
