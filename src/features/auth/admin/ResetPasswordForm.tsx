"use client";

import { useState } from "react";
import { AuthCard } from "@/components/ui/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ResetPasswordFormProps {
  /** 비밀번호 변경이 성공적으로 완료됐을 때 호출된다. */
  onComplete: () => void;
}

/**
 * 비밀번호 재설정 API가 아직 없어서, 실제 변경 없이
 * 화면 흐름만 재현한다 — 제출하면 바로 완료 모달로 전환한다.
 */
export function ResetPasswordForm({ onComplete }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

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
          onComplete();
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

        <Button type="submit" size="lg" className="w-full">
          변경하기
        </Button>
      </form>
    </AuthCard>
  );
}
