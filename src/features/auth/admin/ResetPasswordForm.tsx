"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AuthCard } from "@/components/ui/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { confirmPasswordReset } from "./api";

interface ResetPasswordFormProps {
  /** 비밀번호 변경이 성공적으로 완료됐을 때 호출된다. */
  onComplete: () => void;
}

export function ResetPasswordForm({ onComplete }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      confirmPasswordReset({
        token: new URLSearchParams(window.location.search).get("token") ?? "",
        password,
        passwordConfirm,
      }),
    onSuccess: onComplete,
  });

  return (
    <AuthCard title="비밀번호 재설정">
      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (password !== passwordConfirm) {
            setMismatch(true);
            return;
          }
          setMismatch(false);
          mutation.mutate();
        }}
      >
        <Input
          type="password"
          required
          minLength={8}
          maxLength={100}
          label="새 비밀번호"
          placeholder="새 비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          type="password"
          required
          label="비밀번호 확인"
          placeholder="비밀번호 확인"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          errorText={mismatch ? "비밀번호가 일치하지 않습니다." : undefined}
        />

        {mutation.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(mutation.error)}</p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "변경 중..." : "변경하기"}
        </Button>
      </form>
    </AuthCard>
  );
}
