"use client";

import { BoothMapEditorFileRegisteredState } from "./BoothMapEditorFileRegisteredState";

/**
 * 운영 SSOT를 카카오맵 위경도로 전환하면서(`docs/specs/06_운영자_배치도_등록_파이프라인.md`),
 * 배치도 이미지 업로드 → OpenAI 분석 대기(polling) → Konva 캔버스 편집으로 이어지던
 * 옛 1차 진입 흐름을 걷어내고 카카오 핀 편집기로 바로 들어간다. 이미지 유무는 더 이상
 * 편집 가능 여부를 가리지 않는다. 옛 흐름(`BoothMapEditor`, `analysisPolling`,
 * `mapIdCache`, `BoothMapEditorEmptyState`)은 후속 OpenAI 도면 분석 기능이 돌아올 때를
 * 대비해 파일은 남겨두되 이 경로에서는 더 이상 쓰지 않는다.
 */
export function BoothMapUploadPanel({ festivalId }: { festivalId: string }) {
  return <BoothMapEditorFileRegisteredState festivalId={festivalId} />;
}
