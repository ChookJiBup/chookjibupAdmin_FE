"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, usePathname } from "next/navigation";
import { AdminAuthGuard } from "@/components/auth/AdminAuthGuard";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { Toaster } from "@/components/ui/sonner";
import { getManagedFestival } from "@/features/festivals/api";
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
  const festivalQuery = useQuery({
    queryKey: ["managed-festival", festivalId],
    queryFn: () => getManagedFestival(festivalId as string),
    enabled: Boolean(festivalId),
  });
  const festivalName = festivalQuery.data?.festivalName;

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
            {/*
              Figma 레이아웃 가이드: Columns 3 / Stretch / Margin 40 / Gutter 24.
              Margin은 위 px-10(=40px)가 이미 담당하고, 여기서는 3-컬럼 그리드 +
              24px(gap-6) 거터만 정의한다. 각 화면 루트는 col-span-1/2/3으로
              몇 컬럼을 쓸지 선언한다 — 폭을 w-2/3 같은 비율로 직접 계산하지 않는다.
            */}
            {fullBleed ? children : <div className="grid grid-cols-3 gap-6">{children}</div>}
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </AdminAuthGuard>
  );
}
