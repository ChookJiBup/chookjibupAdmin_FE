"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => void;
  pending?: boolean;
  errorMessage?: string;
}

export function PasswordConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  pending = false,
  errorMessage,
}: PasswordConfirmDialogProps) {
  const [password, setPassword] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !pending) {
      setPassword("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-x-0 top-[118px] bottom-0 z-30 bg-dimmed" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-30 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8">
          <div className="flex h-14 items-center justify-end">
            <Dialog.Close asChild>
              <button type="button" aria-label="닫기" className="text-zinc-950" disabled={pending}>
                <Cross2Icon className="size-6" />
              </button>
            </Dialog.Close>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm(password);
            }}
          >
            <Dialog.Title className="heading-regular text-center text-zinc-950">
              비밀번호를 입력해 주세요
            </Dialog.Title>
            <Dialog.Description className="body-regular mt-3 text-center text-zinc-950">
              안전한 정보 수정을 위해 본인 확인이 필요합니다.
            </Dialog.Description>

            <div className="mt-8">
              <Input
                type="password"
                required
                label="비밀번호"
                placeholder="현재 비밀번호"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                errorText={errorMessage}
              />
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" size="lg" className="flex-1" disabled={!password || pending}>
                {pending ? "확인 중..." : "확인"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
