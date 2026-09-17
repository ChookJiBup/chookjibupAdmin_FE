"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { QueuePathPoint } from "@/features/staffMap/types";

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
    <div aria-label="줄 지점 편집" className="max-h-48 w-full space-y-2 overflow-y-auto">
      <p className="body-caption text-zinc-500">
        지도에서 지점을 끌거나 좌표를 수정하세요.
        {fixedStart ? " 첫 지점은 부스 위치로 고정됩니다." : ""}
      </p>
      {path.map((point, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <span className="body-caption text-zinc-500">지점 {index + 1}</span>
          {(["lat", "lng"] as const).map((axis) => (
            <Input
              key={axis}
              label={`지점 ${index + 1} ${axis === "lat" ? "위도" : "경도"}`}
              type="number"
              step={0.0000001}
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
          {!fixedStart || index > 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={locked}
              aria-label={`지점 ${index + 1} 삭제`}
              onClick={() => onChange(path.filter((_, i) => i !== index))}
            >
              삭제
            </Button>
          ) : null}
          {index < path.length - 1 ? (
            <Button
              size="sm"
              variant="outline"
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
            >
              중간 지점 추가
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
