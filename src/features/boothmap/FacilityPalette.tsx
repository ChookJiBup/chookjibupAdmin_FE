"use client";

import type { BoothMapShapeType } from "./types";

export const FACILITY_COLOR: Record<BoothMapShapeType, string> = {
  BOOTH: "#c8dafd",
  STAGE: "#e9d5ff",
  PATH: "#f4f4f5",
  BUILDING: "#9f9fa9",
  OPEN_SPACE: "#fafafa",
  RESTROOM: "#bfdeff",
  ENTRANCE: "#fca5a5",
  EXIT: "#fdba74",
  PARKING: "#d4d4d8",
  INFORMATION: "#a7f3d0",
  OTHER: "#e4e4e7",
};

const FACILITY_ITEMS: { type: BoothMapShapeType; label: string }[] = [
  { type: "BOOTH", label: "부스" },
  { type: "STAGE", label: "무대" },
  { type: "PATH", label: "통로" },
  { type: "BUILDING", label: "건물" },
  { type: "OPEN_SPACE", label: "공터" },
  { type: "RESTROOM", label: "화장실" },
  { type: "ENTRANCE", label: "출입구" },
  { type: "EXIT", label: "비상구" },
  { type: "PARKING", label: "주차장" },
  { type: "INFORMATION", label: "안내소" },
  { type: "OTHER", label: "기타" },
];

/** 왼쪽 시설 팔레트 — 캔버스로 드래그하거나, 캔버스를 클릭해서 놓을 위치를 정한다. */
export function FacilityPalette({
  pendingType,
  onSelectPending,
}: {
  pendingType: BoothMapShapeType | null;
  onSelectPending: (type: BoothMapShapeType | null) => void;
}) {
  return (
    <div className="flex w-40 shrink-0 flex-col gap-2 rounded-lg border border-zinc-300 p-3">
      <p className="body-small-bold text-zinc-950">시설</p>
      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
        {FACILITY_ITEMS.map((item) => {
          const isPending = pendingType === item.type;
          return (
            <button
              key={item.type}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/booth-map-facility", item.type);
              }}
              onClick={() => onSelectPending(isPending ? null : item.type)}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                isPending
                  ? "border-primary bg-primary/10"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              <span
                className="size-4 shrink-0 rounded border border-zinc-400"
                style={{ backgroundColor: FACILITY_COLOR[item.type] }}
              />
              <span className="body-small text-zinc-950">{item.label}</span>
            </button>
          );
        })}
      </div>
      <p className="body-caption text-zinc-500">
        캔버스로 드래그하거나, 클릭해서 선택한 뒤 캔버스를 클릭하세요.
      </p>
    </div>
  );
}
