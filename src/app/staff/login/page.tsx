"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginStaff } from "@/features/auth/staff/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useStaffAuthStore } from "@/store/staffAuthStore";

export default function StaffLoginPage() {
  const router = useRouter();
  const setSession = useStaffAuthStore((state) => state.setSession);
  const [festivalId, setFestivalId] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginStaff,
    onSuccess: (data) => {
      setSession(data);
      router.push("/staff/dashboard");
    },
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <h1 className="heading-small">스태프 로그인</h1>
      <p className="body-regular text-gray-500">관리자·운영자가 발급한 계정으로 로그인합니다.</p>

      <form
        className="mt-4 flex w-full max-w-xs flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          loginMutation.mutate({ festivalId, loginId, password });
        }}
      >
        {/* TODO: festivalId는 현재 수기 입력이다. 초대 링크/QR의 쿼리 파라미터로
            자동 채워지도록 바뀔 가능성이 높다 — docs/기능명세서.md 참고 */}
        <input
          type="text"
          required
          placeholder="축제 코드"
          value={festivalId}
          onChange={(event) => setFestivalId(event.target.value)}
          className="body-regular rounded-lg border px-3 py-2"
        />
        <input
          type="text"
          required
          placeholder="아이디"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
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
