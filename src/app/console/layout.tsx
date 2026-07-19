import Link from "next/link";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="w-56 shrink-0 border-r p-4">
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/console/festivals">축제 리스트</Link>
          <Link href="/console/mypage">마이페이지</Link>
        </nav>
      </aside>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
