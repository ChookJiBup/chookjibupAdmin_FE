"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CopyIcon, Cross2Icon, DownloadIcon } from "@radix-ui/react-icons";
import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { DIALOG_OVERLAY_CLASSES } from "@/components/ui/dialogOverlay";

export interface ReviewQrDialogProps {
  festivalPublicId: string;
  festivalName: string;
}

/** 축제 현장에서 비회원도 리뷰를 남길 수 있는 방문객 페이지의 QR코드. */
export function ReviewQrDialog({ festivalPublicId, festivalName }: ReviewQrDialogProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reviewUrl = `https://user.chookjibup.store/festivals/${festivalPublicId}/review?source=qr`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      toast.success("리뷰 작성 링크를 복사했습니다.");
    } catch {
      toast.error("링크를 복사하지 못했습니다.");
    }
  }

  function downloadQr() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `축제_리뷰_QR_${festivalPublicId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm">
          리뷰 QR코드
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY_CLASSES} />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-30 flex max-h-[calc(100dvh-40px)] w-[480px] max-w-[calc(100vw-40px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-white p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="heading-small text-zinc-950">리뷰 QR코드</Dialog.Title>
              <Dialog.Description className="body-small mt-2 text-zinc-500">
                {festivalName} 현장에 안내하면 방문객이 QR코드로 리뷰를 작성할 수 있습니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="닫기" className="shrink-0 text-zinc-950">
                <Cross2Icon className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <div
            ref={canvasRef}
            className="mt-6 flex justify-center rounded-lg border border-zinc-200 bg-white p-4"
          >
            <QRCodeCanvas value={reviewUrl} size={240} level="M" marginSize={2} />
          </div>
          <p className="body-caption mt-4 break-all text-zinc-500">{reviewUrl}</p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" icon={<CopyIcon />} onClick={copyLink}>
              링크 복사
            </Button>
            <Button className="flex-1" icon={<DownloadIcon />} onClick={downloadQr}>
              QR 저장
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
