import { Header } from "./Header";
import { Nav, type NavItem } from "./Nav";

/**
 * Figma "login Header+Nav" variant (fileKey MEetGISeArvFjxh6eY4qB9, node
 * 107:28388): Header(72px)와 Navigation(45px)이 간격 없이 세로로 쌓인다 —
 * Height Hug 117px = 72 + 45로 정확히 일치. 인증된 콘솔 화면에서 항상
 * 같이 쓰이므로, 호출부에서 `Header`와 `Nav`를 따로 쌓지 않도록 하나의
 * 단위로 묶어서 제공한다.
 */
interface HeaderNavProps {
  userName?: string;
  navItems?: NavItem[];
  festivalId?: string;
}

export function HeaderNav({ userName, navItems, festivalId }: HeaderNavProps) {
  return (
    <div className="flex flex-col">
      <Header variant="login" userName={userName} />
      <Nav items={navItems} festivalId={festivalId} />
    </div>
  );
}
