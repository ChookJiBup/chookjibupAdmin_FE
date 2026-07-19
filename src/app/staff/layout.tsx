import Link from "next/link";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-1 flex-col">
      <div className="flex-1 p-4">{children}</div>
      <nav className="flex justify-around border-t p-3 text-sm">
        <Link href="/staff/dashboard">대시보드</Link>
      </nav>
    </div>
  );
}
