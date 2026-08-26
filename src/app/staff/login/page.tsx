"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { loginStaff } from "@/features/auth/staff/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useStaffAuthStore } from "@/store/staffAuthStore";

export default function StaffLoginPage() {
  const router = useRouter();
  const setSession = useStaffAuthStore((state) => state.setSession);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [inviteError, setInviteError] = useState("");

  const loginMutation = useMutation({
    mutationFn: loginStaff,
    onSuccess: (data) => {
      setSession(data);
      router.push("/staff/dashboard");
    },
  });

  const errorMessage =
    inviteError || (loginMutation.isError ? getApiErrorMessage(loginMutation.error) : undefined);

  return (
    <main className="flex flex-1 flex-col justify-center">
      <div className="w-full">
        <div className="mb-8 text-center">
          <h1 className="heading-regular text-zinc-950">로그인</h1>
          <p className="body-small mt-2 text-zinc-500">발급받은 스태프 계정으로 로그인해주세요.</p>
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const festivalId = new URL(window.location.href).searchParams.get("festivalId")?.trim();
            if (!festivalId) {
              setInviteError("축제 운영자가 전달한 초대 링크로 접속해주세요.");
              return;
            }
            setInviteError("");
            loginMutation.mutate({ festivalId, loginId: loginId.trim(), password });
          }}
        >
          <Input
            label="아이디"
            type="text"
            required
            autoComplete="username"
            placeholder="아이디를 입력해주세요"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
          <Input
            label="비밀번호"
            type="password"
            required
            autoComplete="current-password"
            placeholder="비밀번호를 입력해주세요"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            errorText={errorMessage}
          />
          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </main>
  );
}
