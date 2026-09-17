"use client";

import { Button } from "@/components/ui/Button";
import type { LatLng } from "./latLng";
import { pathLengthMeters, polygonAreaSquareMeters, type PolygonPreset } from "./shapeGeometry";

const POLYGON_PRESETS: { value: PolygonPreset; label: string }[] = [
  { value: "triangle", label: "삼각형" },
  { value: "square", label: "사각형" },
  { value: "circle", label: "원형" },
];

const numberFormat = new Intl.NumberFormat("ko-KR");

/**
 * 선택한 도형 말풍선에 붙는 모양 편집 영역.
 *
 * 한 번 그린 도형은 꼭짓점을 옮기거나 지울 수만 있어, 세 점으로 그리면 삼각형에서
 * 벗어날 수 없었다. 모양을 통째로 바꾸는 버튼과 점 추가·삭제 방법을 함께 보여 준다.
 */
export function ShapeEditSection({
  kind,
  points,
  onApplyPreset,
  onStraighten,
}: {
  kind: "polygon" | "line";
  points: LatLng[];
  onApplyPreset: (preset: PolygonPreset) => void;
  onStraighten: () => void;
}) {
  const summary =
    kind === "polygon"
      ? `약 ${numberFormat.format(Math.round(polygonAreaSquareMeters(points)))}㎡ · 꼭짓점 ${points.length}개`
      : `약 ${numberFormat.format(Math.round(pathLengthMeters(points)))}m · 점 ${points.length}개`;
  return (
    <section aria-label="모양 편집" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="body-small text-zinc-500">{kind === "polygon" ? "크기" : "길이"}</span>
        <span className="body-small text-zinc-950">{summary}</span>
      </div>
      {kind === "polygon" ? (
        <div className="grid grid-cols-3 gap-1">
          {POLYGON_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              size="sm"
              variant="outline"
              className="px-2"
              onClick={() => onApplyPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={points.length <= 2}
          onClick={onStraighten}
        >
          직선으로 펴기
        </Button>
      )}
      <p className="body-caption text-zinc-500">
        변 가운데 + 를 끌면 점이 추가되고, Alt를 누른 채 점을 누르면 지워집니다.
      </p>
    </section>
  );
}
