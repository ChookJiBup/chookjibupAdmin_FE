import type { BoothMapObject } from "./types";

/**
 * TODO: 실제 업로드 API로 교체한다. 백엔드에 부스맵 관련 엔드포인트가
 * 아직 없어(2026-07-23 기준) 화면 흐름만 확인할 수 있도록 흉내만 낸다.
 * 2~7단계(S3 저장, OpenCV 보정, OCR, SAM2, Vision AI 분류, JSON 생성)를
 * 하나의 지연으로 뭉뚱그렸다.
 */
export async function mockUploadAndProcess(): Promise<BoothMapObject[]> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return [
    { id: "booth-1", type: "BOOTH", label: "부스 1", x: 40, y: 40, width: 80, height: 60 },
    { id: "booth-2", type: "BOOTH", label: "부스 2", x: 140, y: 40, width: 80, height: 60 },
    { id: "path-1", type: "PATH", label: "중앙 통로", x: 40, y: 120, width: 260, height: 30 },
    { id: "restroom-1", type: "RESTROOM", label: "화장실", x: 240, y: 40, width: 60, height: 60 },
    { id: "entrance-1", type: "ENTRANCE", label: "출입구", x: 40, y: 170, width: 60, height: 30 },
  ];
}
