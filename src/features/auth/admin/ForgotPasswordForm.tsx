"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/ui/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * 비밀번호 재설정 이메일 발송 API가 아직 없어서, 실제 발송 없이
 * 화면 흐름만 재현한다 — 제출하면 바로 재설정 화면으로 이동한다.
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <AuthCard title="비밀번호 찾기">
      <p className="body-regular mt-2 text-center text-zinc-950">
        가입한 이메일 주소를 입력해 주세요.
        <br />
        비밀번호 재설정 링크를 보내드립니다.
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          router.push("/reset-password");
        }}
      >
        <Input
          type="email"
          required
          label="이메일"
          placeholder="이메일 주소"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button type="submit" size="lg" className="w-full">
          보내기
        </Button>
      </form>
    </AuthCard>
  );
}
