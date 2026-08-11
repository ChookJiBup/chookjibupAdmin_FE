"use client";

import { useState } from "react";
import { Cross1Icon, Pencil2Icon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

export type MapInfoPopoverMode = "group-create" | "zone-edit" | "booth-edit";

const TYPE_LABEL: Record<MapInfoPopoverMode, string> = {
  "group-create": "구역",
  "zone-edit": "구역",
  "booth-edit": "부스",
};

/**
 * 지도 위 핀/구역을 클릭했을 때 뜨는 말풍선 팝오버 — 그룹(구역) 생성, 구역 이름
 * 수정, 개별 부스 이름 수정 3가지 모드를 하나의 컴포넌트로 처리한다.
 * "상위구역"(중첩 구역)은 아직 지원하지 않아 항상 "-"로 고정 표시한다.
 */
export function MapInfoPopover({
  mode,
  initialName,
  style,
  onConfirm,
  onCancel,
  onDelete,
}: {
  mode: MapInfoPopoverMode;
  initialName: string;
  style?: React.CSSProperties;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initialName);

  return (
    <div className="absolute z-20" style={style}>
      <div className="w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-md">
        <div className="flex items-center gap-2">
          <span className="size-4 shrink-0 text-zinc-500">
            <Pencil2Icon />
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="body-small-bold min-w-0 flex-1 border-none p-0 text-zinc-950 outline-none"
          />
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Cross1Icon />}
            aria-label="닫기"
            onClick={onCancel}
            className="-mr-1 shrink-0"
          />
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="body-small text-zinc-500">유형</span>
            <span className="body-small text-zinc-950">{TYPE_LABEL[mode]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="body-small text-zinc-500">상위구역</span>
            <span className="body-small text-zinc-950">-</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {onDelete ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onDelete}
              className="text-error mr-auto px-0"
            >
              삭제
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onCancel} className="flex-1">
            취소
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onConfirm(name.trim() || initialName)}
            className="flex-1"
          >
            확인
          </Button>
        </div>
      </div>
      <div className="ml-6 -mt-1.5 size-3 rotate-45 border-r border-b border-zinc-200 bg-white" />
    </div>
  );
}
