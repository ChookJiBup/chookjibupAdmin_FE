"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type { AdminRole } from "@/features/auth/admin/types";

/**
 * 콘솔 상단 네비게이션. 축제 범위·역할에 따라 다른 탭 목록을 가로로 나열한다.
 *
 * 각 아이템은 `Button`의 "ghost" + size="sm" 스타일(선택 시 semibold)을
 * 그대로 재사용하되, `<a>` 안에 `<button>`을 중첩하는 대신 `Link`에
 * 직접 적용한다.
 */
export interface NavItem {
  label: string;
  href: string;
}

export interface NavProps {
  /** 명시적인 nav 아이템 목록을 전달하면 아래 기본 로직을 무시하고 그대로 쓴다. */
  items?: NavItem[];
  /**
   * 축제 범위 기본 아이템의 href를 만들 때 쓰는 현재 축제 id.
   * 이 `Nav`가 축제 범위 라우트 아래에서 렌더링될 때는 `[festivalId]`
   * 라우트 파라미터를 기본값으로 사용하므로, 대부분의 호출부는
   * 명시적으로 전달할 필요가 없다.
   */
  festivalId?: string;
  /** 로그인한 관리자의 현재 축제 역할. 총괄관리자/운영자에 따라 노출되는 탭이 다르다. */
  role?: AdminRole | null;
}

function buildDefaultItems(
  festivalId: string | undefined,
  role: AdminRole | null | undefined,
): NavItem[] {
  if (!festivalId) {
    return [
      { label: "축제등록", href: "/console/festivals/new" },
      { label: "축제관리", href: "/console/festivals" },
      { label: "대시보드", href: "/console/festivals/dashboard" },
      { label: "운영자관리", href: "/console/festivals/operators" },
      { label: "스태프관리", href: "/console/festivals/staffs" },
    ];
  }

  const festivalBase = `/console/festivals/${festivalId}`;

  if (role === "SUB_ADMIN") {
    return [
      { label: "대시보드", href: `${festivalBase}/dashboard` },
      { label: "스태프관리", href: `${festivalBase}/staffs` },
    ];
  }

  return [
    { label: "축제관리", href: festivalBase },
    { label: "대시보드", href: `${festivalBase}/dashboard` },
    { label: "운영자관리", href: `${festivalBase}/operators` },
    { label: "스태프관리", href: `${festivalBase}/staffs` },
  ];
}

export function Nav({ items, festivalId, role }: NavProps) {
  const pathname = usePathname();
  const params = useParams<{ festivalId?: string }>();
  const navItems = items ?? buildDefaultItems(festivalId ?? params?.festivalId, role);

  // "축제관리"처럼 다른 탭 href의 상위 경로가 되는 항목이 있을 수 있어,
  // 가장 구체적으로(가장 길게) 일치하는 항목 하나만 active로 표시한다.
  const activeHref = navItems
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname?.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav className="flex items-center gap-1 border-b border-zinc-100 bg-white px-10 py-2">
      {navItems.map((item) => {
        const isActive = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-center justify-center rounded-md px-4 py-1 transition-colors hover:bg-zinc-100 ${
              isActive ? "body-small-bold text-primary" : "body-small text-zinc-950"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
