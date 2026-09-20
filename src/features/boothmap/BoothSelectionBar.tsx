"use client";

import { useState } from "react";
import { Cross1Icon, CornersIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface SelectionZoneOption {
  id: string;
  name: string;
  /** 폴리곤으로 그린 구역인지. 폴리곤은 부스를 그 안으로 옮겨야 소속이 생긴다. */
  drawn: boolean;
}

export interface BoothSelectionBarProps {
  boothCount: number;
  shapeCount: number;
  /** 구역으로 묶을 수 있는 부스 수. 부스가 아닌 핀은 서버가 구역 멤버로 받지 않는다. */
  groupableCount: number;
  zones: SelectionZoneOption[];
  /** 고른 부스 중 이미 어느 구역엔가 묶여 있는 것이 있는지. */
  canUngroup: boolean;
  onGroup: () => void;
  onAssignZone: (zoneId: string) => void;
  onUngroup: () => void;
  onLineUp: () => void;
  onClear: () => void;
}

/**
 * 여러 개를 고른 동안 화면 맨 아래에 붙는 액션 바.
 *
 * 예전에는 「그룹화」가 왼쪽 부스 목록 패널 맨 아래에 있었다. 좁은 화면에서는 그 패널이
 * 접혀 있어, 지도에서 부스를 골라 놓고도 묶을 방법이 보이지 않았다. 고른 것이 있으면
 * 화면 아래에 항상 떠 있게 한다.
 *
 * 생김새는 공용 `Bottombar`(N개 선택됨 + 액션)를 따르되, 그쪽은 액션이 「삭제」 하나로
 * 고정이라 여기서는 같은 규격만 빌려 쓴다.
 */
export function BoothSelectionBar({
  boothCount,
  shapeCount,
  groupableCount,
  zones,
  canUngroup,
  onGroup,
  onAssignZone,
  onUngroup,
  onLineUp,
  onClear,
}: BoothSelectionBarProps) {
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const total = boothCount + shapeCount;
  if (total === 0) return null;

  const groupDisabledReason =
    groupableCount >= 2 ? undefined : "구역으로 묶으려면 부스를 2개 이상 골라야 합니다.";
  const lineUpDisabledReason =
    boothCount >= 2 ? undefined : "줄을 세우려면 부스를 2개 이상 골라야 합니다.";

  return (
    /*
      왼쪽 부스 목록 패널(w-72 + left-8)이 바 위에 겹쳐 «N개 선택됨»을 가린다. 넓은 화면
      에서는 패널 오른쪽부터 시작하게 밀어 둔다 — 지도 위 다른 하단 패널들이 쓰는
      left-[23rem]과 같은 기준이다.
    */
    <div className="fixed inset-x-0 bottom-0 z-30 flex h-[72px] w-full shrink-0 items-center gap-3 border-t border-zinc-200 bg-white px-4 sm:px-10 lg:pl-[24rem]">
      <p className="body-regular shrink-0 text-zinc-950">
        <span className="body-regular-bold text-primary">{total}</span>개 선택됨
        {shapeCount > 0 ? (
          <span className="body-caption ml-2 text-zinc-500">
            부스 {boothCount} · 도형 {shapeCount}
          </span>
        ) : null}
      </p>
      <p className="body-caption hidden truncate text-zinc-500 sm:block">
        지도에서 끌면 함께 움직입니다 · Shift+드래그로 범위 선택
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* 대기줄(사전 줄·현재 줄)과 헷갈리지 않게 무엇을 하는 버튼인지 적어 둔다. */}
        <span
          className="flex"
          title={lineUpDisabledReason ?? "고른 부스를 양 끝 사이에 한 줄로 나란히 놓습니다"}
        >
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(lineUpDisabledReason)}
            onClick={onLineUp}
          >
            줄 세우기
          </Button>
        </span>
        {zones.length > 0 ? (
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              icon={<CornersIcon />}
              selected={zoneMenuOpen}
              aria-expanded={zoneMenuOpen}
              disabled={boothCount === 0}
              title={boothCount === 0 ? "구역에 넣을 부스를 골라 주세요." : undefined}
              onClick={() => setZoneMenuOpen((open) => !open)}
            >
              구역에 넣기
            </Button>
            {zoneMenuOpen ? (
              <div className="absolute bottom-full left-0 z-10 mb-2 max-h-64 w-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 shadow-md">
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
                    className="mt-1 flex w-full items-center rounded-md border-t border-zinc-200 px-2 pt-2 pb-1 text-left hover:bg-zinc-100"
                  >
                    <span className="body-small text-zinc-950">구역에서 빼기</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <span className="flex" title={groupDisabledReason}>
          <Button
            type="button"
            variant="primary"
            disabled={Boolean(groupDisabledReason)}
            onClick={onGroup}
          >
            그룹화
          </Button>
        </span>
        <Button type="button" variant="ghost" icon={<Cross1Icon />} onClick={onClear}>
          선택 해제
        </Button>
      </div>
    </div>
  );
}

/** 지도 아래에 붙는 바가 가리는 높이. 지도 위 다른 하단 패널을 이만큼 띄운다. */
export const SELECTION_BAR_HEIGHT_CLASS = "bottom-[88px]";

export function selectionBarOffset(active: boolean, base: string) {
  return cn(base, active && SELECTION_BAR_HEIGHT_CLASS);
}
