"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/ui/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { confirmEmailVerification, requestEmailVerification, signupAdmin } from "./api";

type Step = "email" | "code" | "profile";

const CODE_TIMER_SECONDS = 5 * 60;

interface SignupFormProps {
  /** 회원가입이 성공적으로 완료됐을 때 호출된다. */
  onComplete: () => void;
}

function formatRemaining(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function SignupForm({ onComplete }: SignupFormProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState("");
  const [remaining, setRemaining] = useState(CODE_TIMER_SECONDS);

  useEffect(() => {
    if (step !== "code" || remaining <= 0) return;
    const timer = setInterval(() => setRemaining((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [step, remaining]);

  const requestCodeMutation = useMutation({
    mutationFn: () => requestEmailVerification({ email }),
    onSuccess: () => {
      setStep("code");
      setRemaining(CODE_TIMER_SECONDS);
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: () => requestEmailVerification({ email }),
    onSuccess: () => setRemaining(CODE_TIMER_SECONDS),
  });

  const confirmCodeMutation = useMutation({
    mutationFn: () => confirmEmailVerification({ email, code }),
    onSuccess: () => setStep("profile"),
  });

  const signupMutation = useMutation({
    mutationFn: () =>
      signupAdmin({
        email,
        name,
        organization: [department, position].filter(Boolean).join(" "),
        password,
        passwordConfirm: password,
      }),
    onSuccess: onComplete,
  });

  return (
    <AuthCard title="회원가입">
      {step === "email" && (
        <>
          <p className="body-regular mt-2 text-center text-zinc-950">
            공무원 이메일 인증을 통해 계정을 생성합니다.
          </p>

          <form
            className="mt-8 flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              requestCodeMutation.mutate();
            }}
          >
            <Input
              type="email"
              required
              label="이메일"
              placeholder="정부/공공기관 이메일"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            {requestCodeMutation.isError && (
              <p className="body-small text-error">
                {getApiErrorMessage(requestCodeMutation.error)}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={requestCodeMutation.isPending}
              className="w-full"
            >
              {requestCodeMutation.isPending ? "발송 중..." : "인증코드 받기"}
            </Button>
          </form>
        </>
      )}

      {step === "code" && (
        <form
          className="mt-8 flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            confirmCodeMutation.mutate();
          }}
        >
          <Input type="email" readOnly label="이메일" value={email} />

          <Input
            type="text"
            required
            inputMode="numeric"
            pattern="^\d{6}$"
            maxLength={6}
            layout="with-button"
            label="인증번호"
            placeholder="인증번호 6자리"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            helperText={
              remaining > 0
                ? `남은 시간 ${formatRemaining(remaining)}`
                : "인증번호가 만료되었습니다."
            }
            button={
              <Button
                type="button"
                variant="outline"
                disabled={resendCodeMutation.isPending}
                onClick={() => resendCodeMutation.mutate()}
              >
                재전송
              </Button>
            }
          />

          {confirmCodeMutation.isError && (
            <p className="body-small text-error">{getApiErrorMessage(confirmCodeMutation.error)}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={code.length !== 6 || confirmCodeMutation.isPending}
            className="w-full"
          >
            {confirmCodeMutation.isPending ? "확인 중..." : "다음"}
          </Button>
        </form>
      )}

      {step === "profile" && (
        <form
          className="mt-8 flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            signupMutation.mutate();
          }}
        >
          <Input type="email" disabled label="이메일" value={email} />
          <Input
            type="password"
            required
            minLength={8}
            maxLength={100}
            label="비밀번호"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            type="text"
            required
            minLength={2}
            maxLength={100}
            label="이름"
            placeholder="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="flex gap-3">
            <Input
              type="text"
              required
              label="부서"
              placeholder="부서"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
            <Input
              type="text"
              required
              label="직급"
              placeholder="직급"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
            />
          </div>

          {signupMutation.isError && (
            <p className="body-small text-error">{getApiErrorMessage(signupMutation.error)}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={!name || !department || !position || !password || signupMutation.isPending}
            className="w-full"
          >
            {signupMutation.isPending ? "가입 중..." : "가입하기"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
