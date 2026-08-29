"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAdminProfile } from "@/features/auth/admin/api";
import { useAdminAuthStore } from "@/store/adminAuthStore";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setProfile = useAdminAuthStore((state) => state.setProfile);
  const profileQuery = useQuery({
    queryKey: ["admin-profile"],
    queryFn: getAdminProfile,
    retry: false,
  });

  useEffect(() => {
    if (profileQuery.data) setProfile(profileQuery.data);
    if (profileQuery.isError) router.replace("/login");
  }, [profileQuery.data, profileQuery.isError, router, setProfile]);

  if (!profileQuery.data) return null;

  return <>{children}</>;
}
