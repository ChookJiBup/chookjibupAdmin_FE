"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/ui/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { loginAdmin } from "./api";

export function LoginForm() {
  const router = useRouter();
  const setSession = useAdminAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (data) => {
      setSession(data.accessToken, data.tokenType ?? "Bearer", data.expiresIn, data.admin);
      router.push("/console");
    },
  });

  return (
    <AuthCard title="로그인">
      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          loginMutation.mutate({ email, password });
        }}
      >
        <Input
          type="email"
          required
          label="이메일"
          placeholder="가입한 이메일"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          type="password"
          required
          label="비밀번호"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {loginMutation.isError && (
          <p className="body-small text-error">{getApiErrorMessage(loginMutation.error)}</p>
        )}

        <Button type="submit" size="lg" disabled={loginMutation.isPending} className="w-full">
          {loginMutation.isPending ? "로그인 중..." : "로그인"}
        </Button>

        <div className="body-small mx-auto flex items-center gap-3 text-zinc-950">
          <Link href="/signup">회원가입</Link>
          <span className="text-zinc-300">|</span>
          <Link href="/forgot-password">비밀번호 찾기</Link>
        </div>
      </form>
    </AuthCard>
  );
}
