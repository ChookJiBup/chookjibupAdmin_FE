import type { AdminRole } from "@/features/auth/admin/types";
import { Header } from "./Header";
import { Nav, type NavItem } from "./Nav";

/**
 * Header(login variant)와 Nav를 간격 없이 세로로 쌓은 콘솔 상단바.
 * 인증된 콘솔 화면에서 항상 같이 쓰이므로, 호출부에서 `Header`와 `Nav`를
 * 따로 쌓지 않도록 하나의 단위로 묶어서 제공한다.
 */
export interface HeaderNavProps {
  userName?: string;
  navItems?: NavItem[];
  festivalId?: string;
  /** 로고 옆에 표시할 현재 축제명. 축제 범위 화면에서만 전달한다. */
  festivalName?: string;
  role?: AdminRole | null;
}

export function HeaderNav({ userName, navItems, festivalId, festivalName, role }: HeaderNavProps) {
  return (
    <div className="flex flex-col">
      <Header variant="login" userName={userName} festivalName={festivalName} role={role} />
      <Nav items={navItems} festivalId={festivalId} role={role} />
    </div>
  );
}
