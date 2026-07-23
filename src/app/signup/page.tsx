"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import {
  confirmEmailVerification,
  requestEmailVerification,
  signupAdmin,
} from "@/features/auth/admin/api";
import { getApiErrorMessage } from "@/lib/api/httpError";

type Step = "email" | "code" | "profile" | "done";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  const requestCodeMutation = useMutation({
    mutationFn: () => requestEmailVerification({ email }),
    onSuccess: () => setStep("code"),
  });

  const confirmCodeMutation = useMutation({
    mutationFn: () => confirmEmailVerification({ email, code }),
    onSuccess: () => setStep("profile"),
  });

  const signupMutation = useMutation({
    mutationFn: () => signupAdmin({ email, name, organization, password, passwordConfirm }),
    onSuccess: () => setStep("done"),
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <h1 className="heading-small">관리자 회원가입</h1>
      <p className="body-regular text-gray-500">공무원 이메일 인증을 통해 계정을 생성합니다.</p>

      {step === "email" && (
        <form
          className="mt-4 flex w-full max-w-xs flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            requestCodeMutation.mutate();
          }}
        >
          <input
            type="email"
            required
            placeholder="정부/공공기관 이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />

          {requestCodeMutation.isError && (
            <p className="body-small text-error">{getApiErrorMessage(requestCodeMutation.error)}</p>
          )}

          <button
            type="submit"
            disabled={requestCodeMutation.isPending}
            className="body-regular-bold rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            {requestCodeMutation.isPending ? "발송 중..." : "인증코드 받기"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form
          className="mt-4 flex w-full max-w-xs flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            confirmCodeMutation.mutate();
          }}
        >
          <p className="body-small text-gray-500">{email}로 발송된 6자리 코드를 입력하세요.</p>
          <input
            type="text"
            required
            inputMode="numeric"
            pattern="^\d{6}$"
            maxLength={6}
            placeholder="인증코드 6자리"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />

          {confirmCodeMutation.isError && (
            <p className="body-small text-error">{getApiErrorMessage(confirmCodeMutation.error)}</p>
          )}

          <button
            type="submit"
            disabled={confirmCodeMutation.isPending}
            className="body-regular-bold rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            {confirmCodeMutation.isPending ? "확인 중..." : "인증코드 확인"}
          </button>
          <button
            type="button"
            onClick={() => requestCodeMutation.mutate()}
            disabled={requestCodeMutation.isPending}
            className="body-small text-gray-500 underline"
          >
            {requestCodeMutation.isPending ? "재발송 중..." : "인증코드 재발송"}
          </button>
        </form>
      )}

      {step === "profile" && (
        <form
          className="mt-4 flex w-full max-w-xs flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (password !== passwordConfirm) {
              setPasswordMismatch(true);
              return;
            }
            setPasswordMismatch(false);
            signupMutation.mutate();
          }}
        >
          <input
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />
          <input
            type="text"
            required
            minLength={2}
            maxLength={255}
            placeholder="소속 조직"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />
          <input
            type="password"
            required
            minLength={8}
            maxLength={100}
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />
          <input
            type="password"
            required
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />

          {passwordMismatch && (
            <p className="body-small text-error">비밀번호가 일치하지 않습니다.</p>
          )}
          {signupMutation.isError && (
            <p className="body-small text-error">{getApiErrorMessage(signupMutation.error)}</p>
          )}

          <button
            type="submit"
            disabled={signupMutation.isPending}
            className="body-regular-bold rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            {signupMutation.isPending ? "가입 중..." : "가입하기"}
          </button>
        </form>
      )}

      {step === "done" && (
        <div className="mt-4 flex w-full max-w-xs flex-col items-center gap-3">
          <p className="body-regular">회원가입이 완료되었습니다.</p>
          <Link href="/login" className="body-regular-bold rounded-lg border px-4 py-2">
            로그인하러 가기
          </Link>
        </div>
      )}
    </main>
  );
}
