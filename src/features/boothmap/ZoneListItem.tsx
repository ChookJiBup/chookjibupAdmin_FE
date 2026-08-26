import type { ReactNode } from "react";
import {
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
        <IconButton
          variant="ghost"
          size="sm"
          icon={<HamburgerMenuIcon />}
          aria-label={`${name} 메뉴`}
          onClick={onSelect}
        />
      </div>
      {expanded ? children : null}
    </div>
  );
}
