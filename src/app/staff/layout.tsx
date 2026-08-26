import Link from "next/link";
import { StaffBadge } from "@/components/ui/RoleBadge";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-1 flex-col bg-white">
      <header className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
        <Link
          href="/staff/dashboard"
          className="flex h-12 w-[87px] items-center justify-center bg-zinc-200"
        >
          <span className="heading-small text-zinc-900">축지법</span>
        </Link>
        <StaffBadge />
      </header>
      <div className="flex flex-1 px-6 py-8 sm:px-10">{children}</div>
    </div>
  );
}
