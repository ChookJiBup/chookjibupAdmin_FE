"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaffAuthHasHydrated, useStaffAuthStore } from "@/store/staffAuthStore";

export function StaffAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useStaffAuthHasHydrated();
  const isSessionValid = useStaffAuthStore((state) => state.isSessionValid());

  useEffect(() => {
    if (hasHydrated && !isSessionValid) {
      router.replace("/staff/login");
    }
  }, [hasHydrated, isSessionValid, router]);

  if (!hasHydrated || !isSessionValid) {
    return null;
  }

  return <>{children}</>;
}
