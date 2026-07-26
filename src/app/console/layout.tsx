"use client";

import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { useAdminAuthStore } from "@/store/adminAuthStore";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const adminName = useAdminAuthStore((state) => state.session?.admin.name);

  return (
    <AdminAuthGuard>
      <div className="flex min-h-full flex-col">
        <HeaderNav userName={adminName} />
        <div className="flex-1 p-6">{children}</div>
      </div>
    </AdminAuthGuard>
  );
}
