"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { DIALOG_OVERLAY_CLASSES } from "./dialogOverlay";
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
  /**
   * 딤(바깥) 클릭과 Esc로 닫을 수 있는지. 기본값 true.
   *
   * 닫으면 안 되는 필수 입력 흐름에서만 false로 끈다. false여도 취소 버튼과
   * 우측 상단 닫기 버튼은 그대로 동작한다 — 실수로 딤을 눌러 닫히는 것만 막을
   * 뿐, 사용자가 빠져나갈 길 자체를 없애지는 않기 위해서다.
   */
  dismissible?: boolean;
  /** 모달 본체에 덧붙일 클래스. 모바일 화면처럼 기본 480px 폭이 맞지 않을 때 사용한다. */
  className?: string;
  /** 딤 오버레이에 덧붙일 클래스. 기본값은 콘솔 상단바 아래만 덮는 위치다. */
  overlayClassName?: string;
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
  dismissible = true,
  className,
  overlayClassName,
}: ConfirmDialogProps) {
  /*
    저장/삭제 요청이 날아가는 중에 딤을 잘못 누르면 요청은 그대로 진행되는데
    모달만 사라져서, 성공했는지 실패했는지 확인할 방법이 없어진다. 그래서
    pending 동안에는 딤 클릭·Esc·닫기 버튼을 모두 잠그고 결과가 올 때까지 둔다.
  */
  const canDismiss = dismissible && !confirmPending;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={cn(DIALOG_OVERLAY_CLASSES, overlayClassName)} />
        {/*
          내용이 길거나 화면이 낮으면 카드가 뷰포트 위아래로 삐져나가는데, 높이 제한도
          스크롤도 없어 그 부분에 아예 손이 닿지 않았다(확인 버튼이 화면 밖으로 나가면
          모달을 닫는 것 말고는 할 수 있는 게 없다). 화면 높이 안에 가두고 넘치면 카드가
          스스로 스크롤되게 한다. `dvh`를 쓰는 이유는 모바일 주소창이 접혔다 펴질 때
          `vh`가 실제 보이는 높이보다 커져 아래쪽이 다시 잘리기 때문이다.
        */}
        <Dialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-30 max-h-[calc(100dvh-40px)] w-[480px] max-w-[calc(100vw-40px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-white p-8",
            className,
          )}
          onEscapeKeyDown={(event) => {
            if (!canDismiss) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (!canDismiss) event.preventDefault();
          }}
        >
          <div className="flex h-14 items-center justify-end">
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                className="text-zinc-950 disabled:text-zinc-400"
                disabled={confirmPending}
              >
                <Cross2Icon className="size-6" />
              </button>
            </Dialog.Close>
          </div>

          <div>
            <Dialog.Title className="heading-regular text-center text-zinc-950">
              {title}
            </Dialog.Title>

            {description ? (
              <Dialog.Description className="body-regular mt-3 text-center text-zinc-950">
                {description}
              </Dialog.Description>
            ) : null}

            <div className="mt-8 flex gap-3">
              <Dialog.Close asChild>
                <Button variant="outline" size="lg" className="flex-1" disabled={confirmPending}>
                  {cancelLabel}
                </Button>
              </Dialog.Close>
              <Button
                variant={confirmVariant}
                size="lg"
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
