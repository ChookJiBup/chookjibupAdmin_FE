"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginAdmin } from "@/features/auth/admin/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useAdminAuthStore } from "@/store/adminAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAdminAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (data) => {
      setSession(data.accessToken, data.tokenType, data.expiresIn, data.admin);
      router.push("/console/festivals");
    },
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <h1 className="heading-small">관리자 로그인</h1>
      <p className="body-regular text-gray-500">
        공무원 이메일 인증으로 가입한 계정으로 로그인합니다. (관리자·운영자 공용)
      </p>

      <form
        className="mt-4 flex w-full max-w-xs flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          loginMutation.mutate({ email, password });
        }}
      >
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="body-regular rounded-lg border px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="body-regular rounded-lg border px-3 py-2"
        />

        {loginMutation.isError && (
          <p className="body-small text-error">{getApiErrorMessage(loginMutation.error)}</p>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="body-regular-bold rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          {loginMutation.isPending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
