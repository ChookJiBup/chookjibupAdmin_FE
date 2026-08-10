import type { ReactNode } from "react";

export interface AuthCardProps {
  title: string;
  children: ReactNode;
}

/**
 * 로그인/회원가입/비밀번호 찾기·재설정 화면에서 공통으로 쓰는
 * 최대 480px 너비의 흰색 카드 + 중앙 정렬 타이틀 뼈대.
 *
 * w-[480px] 고정폭이 아니라 w-full max-w-[480px]를 쓴다 — 480px보다 좁은
 * 화면(작은 창, 모바일)에서 카드가 잘리거나 가로 스크롤이 생기지 않고
 * 화면 폭에 맞게 줄어들게 하기 위해서다.
 */
export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-[480px] rounded-2xl bg-white p-8">
      <h1 className="heading-regular text-center text-zinc-950">{title}</h1>
      {children}
    </div>
  );
}
