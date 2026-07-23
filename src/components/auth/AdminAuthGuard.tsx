"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdminAuthHasHydrated, useAdminAuthStore } from "@/store/adminAuthStore";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAdminAuthHasHydrated();
  const isSessionValid = useAdminAuthStore((state) => state.isSessionValid());

  useEffect(() => {
    if (hasHydrated && !isSessionValid) {
      router.replace("/login");
    }
  }, [hasHydrated, isSessionValid, router]);

  if (!hasHydrated || !isSessionValid) {
    return null;
  }

  return <>{children}</>;
}
