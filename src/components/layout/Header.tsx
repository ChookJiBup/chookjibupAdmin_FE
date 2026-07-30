import { PersonIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Header variant는 3가지:
 * - "default": 공개 페이지용 헤더, 회원가입 CTA.
 * - "signup": 공개 페이지용 헤더, 로그인 CTA.
 * - "login": 인증된 콘솔 헤더 — CTA 없이 유저 메뉴 버튼
 *   (사람 아이콘 + "{userName} 님")을 보여주며, 아래에 <Nav />와 함께 쓰인다.
 *
 * 세 variant 모두 우측 CTA/유저 버튼은 이 프로젝트의 `Button` 컴포넌트와
 * 동일한 스타일을 사용한다(default/signup은 outline, login은 ghost).
 * 로고는 87x48 고정 크기의 zinc-200 placeholder box이며(아직 실제 로고
 * 에셋이 없음), 그 박스 안에 워드마크 텍스트로 렌더링한다.
 */
export type HeaderVariant = "default" | "signup" | "login";

export interface HeaderProps {
  variant?: HeaderVariant;
  /** 로고가 링크할 경로. */
  href?: string;
  /** "login" variant에서 로고 옆에 표시할 현재 축제명. 축제 범위 화면에서만 전달한다. */
  festivalName?: string;
  /** "login" variant의 유저 메뉴 버튼에 표시할 이름. */
  userName?: string;
  /** "login" variant에서 유저 메뉴 버튼이 링크할 경로. 기본값은 마이페이지. */
  userMenuHref?: string;
  /** "default"/"signup" variant에서 CTA가 링크할 경로. 기본값은 서로 교차 링크(회원가입↔로그인). */
  ctaHref?: string;
  /** 기본 우측 액션 버튼을 완전히 덮어쓴다. */
  action?: ReactNode;
}

/**
 * `Button`의 ghost/outline + size="default" 스타일을 그대로 옮긴 값들 —
 * 실제 네비게이션이 필요해 `<button>`을 `<a>` 안에 중첩하지 않고 `Link`에
 * 직접 적용한다.
 */
const USER_MENU_LINK_CLASSES =
  "inline-flex items-center justify-center gap-2.5 rounded-md px-4 py-2 body-regular text-zinc-950 transition-colors hover:bg-zinc-100";
const CTA_LINK_CLASSES =
  "inline-flex items-center justify-center gap-2.5 rounded-md border border-zinc-300 bg-white px-4 py-2 body-regular text-zinc-950 transition-colors hover:bg-zinc-100";

export function Header({
  variant = "default",
  href = "/",
  festivalName,
  userName = "user",
  userMenuHref = "/console/mypage",
  ctaHref = variant === "signup" ? "/login" : "/signup",
  action,
}: HeaderProps) {
  const defaultAction =
    variant === "login" ? (
      <Link href={userMenuHref} className={USER_MENU_LINK_CLASSES}>
        <span className="size-4 shrink-0">
          <PersonIcon />
        </span>
        {userName} 님
      </Link>
    ) : (
      <Link href={ctaHref} className={CTA_LINK_CLASSES}>
        {variant === "signup" ? "로그인" : "회원가입"}
      </Link>
    );

  return (
    <header className="flex items-center justify-between bg-white px-10 py-3">
      <div className="flex items-center gap-3">
        <Link
          href={href}
          className="flex h-12 w-[87px] shrink-0 items-center justify-center bg-zinc-200"
        >
          <span className="heading-small text-primary">축지법</span>
        </Link>
        {festivalName ? (
          <span className="body-regular-bold text-zinc-950">{festivalName}</span>
        ) : null}
      </div>
      {action ?? defaultAction}
    </header>
  );
}
