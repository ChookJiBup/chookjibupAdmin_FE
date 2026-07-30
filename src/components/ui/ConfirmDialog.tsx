"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { Button, type ButtonVariant } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 기본값: "삭제하시겠습니까?" */
  title?: string;
  description?: string;
  /** 기본값: "취소" */
  cancelLabel?: string;
  /** 기본값: "삭제" */
  confirmLabel?: string;
  /** 확인 버튼 스타일. 기본값은 "destructive"(삭제류), 등록/저장류 확인에는 "primary"를 전달한다. */
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  confirmPending?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "삭제하시겠습니까?",
  description,
  cancelLabel = "취소",
  confirmLabel = "삭제",
  confirmVariant = "destructive",
  onConfirm,
  confirmPending = false,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-dimmed" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8">
          <div className="flex items-center justify-end">
            <Dialog.Close asChild>
              <button type="button" aria-label="닫기" className="text-zinc-950">
                <Cross2Icon className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div>
            <Dialog.Title className="heading-small text-center text-zinc-950">{title}</Dialog.Title>

            {description ? (
              <Dialog.Description className="body-regular mt-3 text-center text-zinc-950">
                {description}
              </Dialog.Description>
            ) : null}

            <div className="mt-8 flex gap-3">
              <Dialog.Close asChild>
                <Button variant="outline" className="flex-1">
                  {cancelLabel}
                </Button>
              </Dialog.Close>
              <Button
                variant={confirmVariant}
                className="flex-1"
                disabled={confirmPending}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
