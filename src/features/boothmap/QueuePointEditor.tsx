"use client";

import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui/IconButton";
import type { QueuePathPoint } from "@/features/staffMap/types";

const COORDINATE_INPUT_CLASS =
  "body-small w-full min-w-0 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-950 outline-none focus:border-primary disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400";

/** 지도에서 끌기 어려운 지점을 좌표로 고치는 표. 평소에는 접어 두고 필요할 때만 연다. */
export function QueuePointEditor({
  path,
  onChange,
  locked,
  fixedStart = false,
}: {
  path: QueuePathPoint[];
  onChange: (path: QueuePathPoint[]) => void;
  locked: boolean;
  fixedStart?: boolean;
}) {
  if (path.length === 0) return null;
  return (
    <div aria-label="줄 지점 편집" className="w-full">
      <div className="body-caption grid grid-cols-[3.5rem_1fr_1fr_4rem] gap-2 px-1 pb-1 text-zinc-500">
        <span>지점</span>
        <span>위도</span>
        <span>경도</span>
        <span />
      </div>
      <div className="max-h-36 overflow-y-auto">
        {path.map((point, index) => (
          <div
            key={index}
            className="grid grid-cols-[3.5rem_1fr_1fr_4rem] items-center gap-2 border-t border-zinc-100 px-1 py-1"
          >
            <span className="body-small text-zinc-950">
              {index + 1}
              {fixedStart && index === 0 ? (
                <span className="body-caption ml-1 text-zinc-500">부스</span>
              ) : null}
            </span>
            {(["lat", "lng"] as const).map((axis) => (
              <input
                key={axis}
                aria-label={`지점 ${index + 1} ${axis === "lat" ? "위도" : "경도"}`}
                type="number"
                step={0.0000001}
                className={COORDINATE_INPUT_CLASS}
                value={Number.isNaN(point[axis]) ? "" : point[axis]}
                disabled={locked || (fixedStart && index === 0)}
                onChange={(event) =>
                  onChange(
                    path.map((p, i) =>
                      i === index ? { ...p, [axis]: event.target.valueAsNumber } : p,
                    ),
                  )
                }
              />
            ))}
            <span className="flex items-center justify-end">
              {index < path.length - 1 ? (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<PlusIcon />}
                  disabled={locked || path.length >= 500}
                  aria-label={`지점 ${index + 1} 뒤에 추가`}
                  onClick={() => {
                    const next = path[index + 1];
                    onChange([
                      ...path.slice(0, index + 1),
                      { lat: (point.lat + next.lat) / 2, lng: (point.lng + next.lng) / 2 },
                      ...path.slice(index + 1),
                    ]);
                  }}
                />
              ) : null}
              {!fixedStart || index > 0 ? (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<TrashIcon />}
                  disabled={locked}
                  aria-label={`지점 ${index + 1} 삭제`}
                  onClick={() => onChange(path.filter((_, i) => i !== index))}
                />
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
