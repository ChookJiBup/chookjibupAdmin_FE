"use client";

import { BoothMapEditorFileRegisteredState } from "./BoothMapEditorFileRegisteredState";

/** 핀이 하나도 없는 카카오 부스맵 편집 화면. */
export function BoothMapEditorEmptyState({ festivalId }: { festivalId: string }) {
  return <BoothMapEditorFileRegisteredState festivalId={festivalId} />;
}
