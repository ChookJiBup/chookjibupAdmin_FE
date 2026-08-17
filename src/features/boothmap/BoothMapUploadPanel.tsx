"use client";

import { useSearchParams } from "next/navigation";
import { BoothMapEditorFileRegisteredState } from "./BoothMapEditorFileRegisteredState";

/**
 * 부스맵 진입점. 배치도 사진 분석(OpenAI polling)과 이미지 캔버스 에디터는
 * 쓰지 않고, 카카오맵에서 좌표를 찍는 화면만 연다.
 */
export function BoothMapUploadPanel({ festivalId }: { festivalId: string }) {
  const isMockReadyPreview = useSearchParams().get("preview") === "ready";

  return (
    <BoothMapEditorFileRegisteredState
      festivalId={festivalId}
      seedMockBooths={isMockReadyPreview}
    />
  );
}
