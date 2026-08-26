"use client";

import { useState, type ReactNode } from "react";
import {
  Cross1Icon,
  DimensionsIcon,
  Pencil2Icon,
  RadiobuttonIcon,
  RulerHorizontalIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { MapOverlayCard } from "@/components/map/MapOverlayCard";

export type MapInfoPopoverMode = "group-create" | "zone-edit" | "booth-edit";
export type MapObjectTypeCategory = "pin" | "polygon" | "line";

const TYPE_LABEL: Record<MapInfoPopoverMode, string> = {
  "group-create": "구역",
  "zone-edit": "구역",
  "booth-edit": "부스",
};

const TYPE_CATEGORY_OPTIONS: { value: MapObjectTypeCategory; label: string; icon: ReactNode }[] = [
  { value: "pin", label: "핀", icon: <RadiobuttonIcon /> },
  { value: "polygon", label: "폴리곤", icon: <DimensionsIcon /> },
  { value: "line", label: "라인", icon: <RulerHorizontalIcon /> },
];

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
  onChangeType,
  confirmLabel = "확인",
  hideCancel = false,
}: {
  mode: MapInfoPopoverMode;
  initialName: string;
  style?: React.CSSProperties;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  /** 전달하면 유형 행 아래에 "유형 변경하기" 버튼을 노출한다(핀/폴리곤/라인 대분류 변경용). */
  onChangeType?: (type: MapObjectTypeCategory) => void;
  /** 확인 버튼 라벨. 그룹(구역) 생성 직후 재편집 흐름에서는 "등록"으로 쓴다. */
  confirmLabel?: string;
  /**
   * true면 "취소" 버튼을 숨기고 삭제 버튼을 outline·flex-1로 확인 버튼과 나란히 두며,
   * 삭제/확인 클릭 시 바로 실행하지 않고 확인 모달을 한 번 더 띄운다(구역 재편집 흐름).
   */
  hideCancel?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);

  return (
    <div className="absolute z-20" style={style}>
      <MapOverlayCard showPointer>
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
          {onChangeType ? (
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<UpdateIcon />}
                onClick={() => setTypeMenuOpen((prev) => !prev)}
                className="w-full"
              >
                유형 변경하기
              </Button>
              {typeMenuOpen ? (
                <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white p-1 shadow-md">
                  {TYPE_CATEGORY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChangeType(option.value);
                        setTypeMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-zinc-100"
                    >
                      <span className="size-4 shrink-0 text-zinc-500">{option.icon}</span>
                      <span className="body-small flex-1 text-zinc-950">{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="body-small text-zinc-500">상위구역</span>
            <span className="body-small text-zinc-950">-</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {onDelete && hideCancel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPendingDelete(true)}
              className="flex-1"
            >
              삭제
            </Button>
          ) : null}
          {onDelete && !hideCancel ? (
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
          {hideCancel ? null : (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="flex-1">
              취소
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() =>
              hideCancel ? setPendingConfirm(true) : onConfirm(name.trim() || initialName)
            }
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </MapOverlayCard>

      {hideCancel && onDelete ? (
        <ConfirmDialog
          open={pendingDelete}
          onOpenChange={setPendingDelete}
          title="삭제하시겠습니까?"
          confirmLabel="삭제"
          confirmVariant="destructive"
          onConfirm={() => {
            setPendingDelete(false);
            onDelete();
          }}
        />
      ) : null}
      {hideCancel ? (
        <ConfirmDialog
          open={pendingConfirm}
          onOpenChange={setPendingConfirm}
          title={`${confirmLabel}하시겠습니까?`}
          confirmLabel={confirmLabel}
          confirmVariant="primary"
          onConfirm={() => {
            setPendingConfirm(false);
            onConfirm(name.trim() || initialName);
          }}
        />
      ) : null}
    </div>
  );
}
