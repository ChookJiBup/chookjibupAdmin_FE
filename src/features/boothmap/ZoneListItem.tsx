import type { ReactNode } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CornersIcon,
  HamburgerMenuIcon,
} from "@radix-ui/react-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface ZoneListItemProps {
  name: string;
  count: number;
  expanded: boolean;
  checked: boolean;
  selected?: boolean;
  onToggleExpanded: () => void;
  onCheckedChange: (checked: boolean) => void;
  onSelect: () => void;
  /**
   * 순서 바꾸기. 부스 행과 같은 방식으로 손잡이를 잡아 끈다 — 화살표 버튼을 따로 두면
   * 한 줄에 버튼이 넷이 되어 구역 이름이 잘리고, 같은 목록 안에서 조작 방식이 둘로 갈린다.
   */
  reorder?: {
    /** 지금 이 행을 끌고 있는지. 끌고 있는 행은 흐리게 둔다. */
    dragging: boolean;
    /** 손잡이에서 시작한 끌기만 허용한다. 행 전체를 draggable로 두면 체크박스 클릭이 샌다. */
    draggable: boolean;
    disabled?: boolean;
    onHandleDown: () => void;
    onHandleUp: () => void;
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };
  children?: ReactNode;
}

/** 상위 존 행과 하위 부스 트리의 공통 레이아웃. */
export function ZoneListItem({
  name,
  count,
  expanded,
  checked,
  selected = false,
  onToggleExpanded,
  onCheckedChange,
  onSelect,
  reorder,
  children,
}: ZoneListItemProps) {
  return (
    <div className="flex flex-col">
      <div
        draggable={reorder?.draggable ?? false}
        onDragStart={reorder?.onDragStart}
        onDragOver={reorder?.onDragOver}
        onDrop={(event) => event.preventDefault()}
        onDragEnd={reorder?.onDragEnd}
        className={cn(
          // 고른 행의 배경은 부스 행과 같이 패널 좌우 여백까지 넓힌다.
          "-mx-6 flex items-center gap-2 border-b border-zinc-200 px-6 pt-4 pb-3 transition-[background-color,opacity] duration-150",
          selected && "bg-primary/10",
          reorder?.dragging && "opacity-40",
        )}
      >
        <button
          type="button"
          aria-label={expanded ? "구역 접기" : "구역 펼치기"}
          onClick={onToggleExpanded}
          className="shrink-0 text-zinc-950"
        >
          {expanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
        </button>
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="shrink-0 border-zinc-200"
        />
        <span className="flex size-4 shrink-0 items-center justify-center text-primary [&_svg]:size-4">
          <CornersIcon />
        </span>
        <button
          type="button"
          onClick={onSelect}
          className="-ml-1 flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          <span className="body-regular-bold truncate text-zinc-950">{name}</span>
          <span className="body-regular-bold text-primary">{count}</span>
        </button>
        <span
          onMouseDown={reorder && !reorder.disabled ? reorder.onHandleDown : undefined}
          onMouseUp={reorder?.onHandleUp}
          title={reorder ? "끌어서 순서 바꾸기" : undefined}
          className={cn(
            "shrink-0 touch-none text-zinc-400",
            reorder && !reorder.disabled ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
        >
          <HamburgerMenuIcon />
        </span>
      </div>
      {expanded ? children : null}
    </div>
  );
}
