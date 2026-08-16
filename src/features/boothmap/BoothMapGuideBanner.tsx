"use client";

import { useState } from "react";
import { Cross1Icon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui/IconButton";

/** 부스맵 에디터 화면 좌상단에 뜨는 dismissible 안내 배너(Figma "toast"). */
export function BoothMapGuideBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="flex w-[282px] items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-4 shadow-md">
      <div className="flex flex-col gap-1">
        <p className="body-small-bold text-zinc-950">축제부스지도 수정</p>
        <p className="body-small text-zinc-500">
          우측 리스트/지도상의 핀/모달을 선택해 상세 정보를 편집할 수 있습니다.
        </p>
      </div>
      <IconButton
        variant="ghost"
        size="sm"
        icon={<Cross1Icon />}
        aria-label="안내 닫기"
        onClick={() => setOpen(false)}
        className="-mr-1 shrink-0 text-zinc-500"
      />
    </div>
  );
}
