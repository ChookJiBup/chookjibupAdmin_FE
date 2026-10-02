"use client";

import { useEffect, useRef, useState } from "react";
import { CornersIcon, Cross1Icon, MagicWandIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";

export interface SelectionZoneOption {
  id: string;
  name: string;
  drawn: boolean;
}

export interface BoothSelectionBarProps {
  boothCount: number;
  shapeCount: number;
  groupableCount: number;
  zones: SelectionZoneOption[];
  canUngroup: boolean;
  aiRouteDisabledReason?: string;
  aiRoutePending?: boolean;
  aiRouteProgress?: string;
  disabled?: boolean;
  onAiRoute: () => void;
  onGroup: () => void;
  onAssignZone: (zoneId: string) => void;
  onUngroup: () => void;
  onLineUp: () => void;
  onClear: () => void;
}

/** 왼쪽 축제부스 패널 하단에 고정되는 다중 선택 작업 영역. */
export function BoothSelectionBar({
  boothCount,
  shapeCount,
  groupableCount,
  zones,
  canUngroup,
  aiRouteDisabledReason,
  aiRoutePending = false,
  aiRouteProgress,
  disabled = false,
  onAiRoute,
  onGroup,
  onAssignZone,
  onUngroup,
  onLineUp,
  onClear,
}: BoothSelectionBarProps) {
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const zoneMenuRef = useRef<HTMLDivElement>(null);
  const total = boothCount + shapeCount;
  const groupDisabledReason = groupableCount >= 2 ? undefined : "부스를 2개 이상 골라야 합니다.";
  const lineUpDisabledReason = boothCount >= 2 ? undefined : "부스를 2개 이상 골라야 합니다.";

  useEffect(() => {
    if (!zoneMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!zoneMenuRef.current?.contains(event.target as Node)) setZoneMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [zoneMenuOpen]);

  return (
    <div className="shrink-0 border-t-2 border-zinc-200 pt-3" data-map-tools>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="body-small text-zinc-950">
          <span className="body-small-bold text-primary">{total}</span>개 선택됨
          {shapeCount > 0 ? (
            <span className="body-caption ml-1 text-zinc-500">
              (부스 {boothCount} · 도형 {shapeCount})
            </span>
          ) : null}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<Cross1Icon />}
          disabled={disabled}
          onClick={onClear}
          className="shrink-0 px-1 text-zinc-500"
        >
          선택 해제
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <span className="flex" title={groupDisabledReason}>
          <Button
            type="button"
            variant="primary"
            size="default"
            className="w-full"
            disabled={disabled || Boolean(groupDisabledReason)}
            onClick={onGroup}
          >
            그룹화
          </Button>
        </span>
        <div ref={zoneMenuRef} className="relative min-w-0">
          <Button
            type="button"
            variant="outline"
            size="default"
            icon={<CornersIcon className="size-4" />}
            selected={zoneMenuOpen}
            aria-expanded={zoneMenuOpen}
            disabled={disabled || boothCount === 0 || zones.length === 0}
            title={zones.length === 0 ? "넣을 수 있는 구역이 없습니다." : undefined}
            onClick={() => setZoneMenuOpen((open) => !open)}
            className="w-full gap-1.5"
          >
            구역에 넣기
          </Button>
          {zoneMenuOpen ? (
            <div className="absolute bottom-full right-0 z-10 mb-2 max-h-64 w-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 shadow-md">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => {
                    onAssignZone(zone.id);
                    setZoneMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-zinc-100"
                >
                  <span className="body-small truncate text-zinc-950">{zone.name}</span>
                  <span className="body-caption ml-auto shrink-0 text-zinc-500">
                    {zone.drawn ? "폴리곤" : "묶음"}
                  </span>
                </button>
              ))}
              {canUngroup ? (
                <button
                  type="button"
                  onClick={() => {
                    onUngroup();
                    setZoneMenuOpen(false);
                  }}
                  className="mt-1 flex w-full items-center border-t border-zinc-200 px-2 pt-2 pb-1 text-left hover:bg-zinc-100"
                >
                  <span className="body-small text-zinc-950">구역에서 빼기</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <span className="flex" title={lineUpDisabledReason}>
          <Button
            type="button"
            variant="outline"
            size="default"
            className="w-full"
            disabled={disabled || Boolean(lineUpDisabledReason)}
            onClick={onLineUp}
          >
            줄 세우기
          </Button>
        </span>
        <span
          className="flex"
          title={aiRouteDisabledReason ?? "선택한 부스마다 AI 추천 대기줄을 만듭니다."}
        >
          <Button
            type="button"
            variant="outline"
            size="default"
            icon={<MagicWandIcon className="size-4" />}
            className="w-full gap-1.5"
            disabled={disabled || Boolean(aiRouteDisabledReason)}
            onClick={onAiRoute}
          >
            {aiRoutePending ? `AI 길찾기 ${aiRouteProgress ?? "진행 중"}` : "AI 길찾기"}
          </Button>
        </span>
      </div>
    </div>
  );
}
