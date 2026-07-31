/**
 * 부스맵 업로드~자동배치 파이프라인의 프론트 상태 머신.
 * 2~7단계(S3 저장~도메인 객체 JSON 생성)는 백엔드 API가 아직 없어
 * "processing" 하나로 뭉뚱그려 두었다. docs/specs/02_부스맵_배치_파이프라인.md 참고.
 */
export type BoothMapUploadState =
  | { status: "idle" }
  | { status: "selected"; file: File; previewUrl: string }
  | { status: "uploading"; file: File; previewUrl: string }
  | { status: "processing"; previewUrl: string }
  | { status: "done"; objects: BoothMapObject[] }
  | { status: "error"; message: string };

/**
 * 좌표/크기가 있는 사각형 시설(부스, 건물, 화장실 등).
 * 좌표/크기 단위, 타입 enum 값은 백엔드 스키마 확정 전까지 가짜다.
 * (docs/specs/03_부스맵_에디터_구현계획.md — FestivalBooth에 좌표 필드가 없어
 * 지금은 화면(로컬 상태/localStorage) 안에서만 유효하다.)
 */
export type BoothMapShapeType =
  "BOOTH" | "PATH" | "BUILDING" | "OPEN_SPACE" | "RESTROOM" | "ENTRANCE";

export interface BoothMapShape {
  kind: "shape";
  id: string;
  type: BoothMapShapeType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 대기 라인(줄) — 클릭으로 점을 찍어 만드는 꺾은선. */
export interface BoothMapQueueLine {
  kind: "line";
  id: string;
  label: string;
  /** Konva Line이 바로 쓸 수 있는 평탄화 좌표 [x1, y1, x2, y2, ...] */
  points: number[];
}

export type BoothMapObject = BoothMapShape | BoothMapQueueLine;
