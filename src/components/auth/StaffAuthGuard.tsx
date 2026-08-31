"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCurrentStaff } from "@/features/auth/staff/api";
import { useStaffAuthStore } from "@/store/staffAuthStore";

export function StaffAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setSession = useStaffAuthStore((state) => state.setSession);
  const sessionQuery = useQuery({
    queryKey: ["staff-session"],
    queryFn: getCurrentStaff,
    retry: false,
  });

  useEffect(() => {
    if (sessionQuery.data) setSession(sessionQuery.data);
    if (sessionQuery.isError) router.replace("/staff/login");
  }, [router, sessionQuery.data, sessionQuery.isError, setSession]);

  if (!sessionQuery.data) return null;
  return <>{children}</>;
}
