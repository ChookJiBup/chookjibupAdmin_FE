"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

/**
 * Figma "Navigation" 프레임, "login Header Spacing" variant의 일부
 * (fileKey MEetGISeArvFjxh6eY4qB9, node 107:28388). Row: Height Hug 45px
 * (size/2=8px 수직 패딩 + 29px 높이 버튼들), 40px 수평 패딩,
 * 1px zinc-100 border, 5개 nav 아이템.
 *
 * 각 아이템은 `Button`의 "ghost" + size="sm" 토큰(Hug 81px, padding size/1
 * size/4, corner rounded-md, 선택 시 semibold)을 그대로 재사용하되,
 * `<a>` 안에 `<button>`을 중첩하는 대신 `Link`에 직접 적용한다.
 */
export interface NavItem {
  label: string;
  href: string;
}

interface NavProps {
  /** 명시적인 nav 아이템 목록. 기본값은 아래 5개 콘솔 섹션. */
  items?: NavItem[];
  /**
   * 축제 범위 기본 아이템의 href를 만들 때 쓰는 현재 축제 id.
   * 이 `Nav`가 축제 범위 라우트 아래에서 렌더링될 때는 `[festivalId]`
   * 라우트 파라미터를 기본값으로 사용하므로, 대부분의 호출부는
   * 명시적으로 전달할 필요가 없다.
   */
  festivalId?: string;
}

function buildDefaultItems(festivalId?: string): NavItem[] {
  const festivalBase = festivalId ? `/console/festivals/${festivalId}` : "/console/festivals";
  return [
    { label: "축제등록", href: "/console/festivals/new" },
    { label: "축제관리", href: "/console/festivals" },
    { label: "대시보드", href: `${festivalBase}/dashboard` },
    { label: "운영자관리", href: `${festivalBase}/operators` },
    { label: "스태프관리", href: `${festivalBase}/staffs` },
  ];
}

export function Nav({ items, festivalId }: NavProps) {
  const pathname = usePathname();
  const params = useParams<{ festivalId?: string }>();
  const navItems = items ?? buildDefaultItems(festivalId ?? params?.festivalId);

  return (
    <nav className="flex items-center gap-1 border-b border-zinc-100 bg-white px-10 py-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

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
