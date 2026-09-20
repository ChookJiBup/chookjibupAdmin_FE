import type { ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CornersIcon,
  HamburgerMenuIcon,
} from "@radix-ui/react-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/IconButton";
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
  /** 구역 순서를 한 칸 올린다. 이 순서가 저장 때 sortOrder가 되고 스태프 앱 목록 순서가 된다. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  moveUpDisabled?: boolean;
  moveDownDisabled?: boolean;
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
  onMoveUp,
  onMoveDown,
  moveUpDisabled = false,
  moveDownDisabled = false,
  children,
}: ZoneListItemProps) {
  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-zinc-200 pt-4 pb-3 pl-1",
          selected && "bg-primary/10",
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
        {onMoveUp ? (
          <IconButton
            variant="ghost"
            size="sm"
            icon={<ArrowUpIcon />}
            aria-label={`${name} 순서 올리기`}
            title="순서 올리기"
            disabled={moveUpDisabled}
            onClick={onMoveUp}
          />
        ) : null}
        {onMoveDown ? (
          <IconButton
            variant="ghost"
            size="sm"
            icon={<ArrowDownIcon />}
            aria-label={`${name} 순서 내리기`}
            title="순서 내리기"
            disabled={moveDownDisabled}
            onClick={onMoveDown}
          />
        ) : null}
        {/*
          순서 버튼이 붙으면 한 줄에 버튼이 네 개가 되어 구역 이름이 «로스...»로 잘린다.
          햄버거는 이름을 누르는 것과 같은 동작이라 그때는 뺀다.
        */}
        {onMoveUp || onMoveDown ? null : (
          <IconButton
            variant="ghost"
            size="sm"
            icon={<HamburgerMenuIcon />}
            aria-label={`${name} 메뉴`}
            onClick={onSelect}
          />
        )}
      </div>
      {expanded ? children : null}
    </div>
  );
}
