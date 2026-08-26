import Link from "next/link";
import { AuthCard } from "@/components/ui/AuthCard";

const KIND_LINK_CLASSES =
  "inline-flex w-full items-center justify-center rounded-md px-4 py-3 body-large text-white bg-primary transition-colors hover:bg-primary/90";
const KIND_LINK_OUTLINE_CLASSES =
  "inline-flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-3 body-large text-zinc-950 transition-colors hover:bg-zinc-100";

export function SignupKindSelect() {
  return (
    <AuthCard title="회원가입">
      <p className="body-regular mt-2 text-center text-zinc-500">가입 유형을 선택해 주세요.</p>
      <div className="mt-8 flex flex-col gap-3">
        <Link href="/signup/government" className={KIND_LINK_CLASSES}>
          공무원으로 가입
        </Link>
        <Link href="/signup/contractor" className={KIND_LINK_OUTLINE_CLASSES}>
          외부업자로 가입
        </Link>
      </div>
    </AuthCard>
  );
}
