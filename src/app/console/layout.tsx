"use client";

import { useParams, usePathname } from "next/navigation";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { useConsoleUiStore } from "@/store/consoleUiStore";

/** 특정 축제 범위가 없는 화면(메인홈, 축제등록)은 5개 탭 대신 "축제등록" 버튼만 노출한다. */
const HOME_NAV_ITEMS = [{ label: "축제등록", href: "/console/festivals/new" }];
const HOME_NAV_PATHS = ["/console", "/console/festivals/new", "/console/mypage"];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const adminName = useAdminAuthStore((state) => state.session?.admin.name);
  const adminRole = useAdminAuthStore((state) => state.session?.admin.role);
  const hideNav = useConsoleUiStore((state) => state.hideNav);
  const fullBleed = useConsoleUiStore((state) => state.fullBleed);
  const pathname = usePathname();
  const params = useParams<{ festivalId?: string }>();
  const festivalId = params?.festivalId;
  const navItems = pathname && HOME_NAV_PATHS.includes(pathname) ? HOME_NAV_ITEMS : undefined;
  // 축제 단건 조회 API가 아직 없어 축제명을 실제로 불러오지 못한다.
  // API가 준비되면 festivalId로 실제 축제명을 조회해 이 값을 대체해야 한다.
  const festivalName = festivalId ? "김천김밥축제" : undefined;

  return (
    <AdminAuthGuard>
      <div className="flex h-screen flex-col">
        <HeaderNav
          userName={adminName}
          navItems={navItems}
          festivalName={festivalName}
          role={adminRole}
          hideNav={hideNav}
        />
        <div className="relative flex-1">
          <div
            className={cn(
              "absolute inset-0",
              fullBleed ? "overflow-hidden" : "overflow-y-auto px-10 py-[30px]",
            )}
          >
            {children}
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </AdminAuthGuard>
  );
}
