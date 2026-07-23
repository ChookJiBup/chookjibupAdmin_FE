import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">축지법</h1>
      <div className="flex gap-3">
        <Link href="/login" className="rounded-lg border px-4 py-2">
          관리자/운영자 로그인
        </Link>
        <Link href="/staff/login" className="rounded-lg border px-4 py-2">
          스태프 로그인
        </Link>
      </div>
    </main>
  );
}
