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
  | { status: "done"; previewUrl: string; objects: BoothMapObject[] }
  | { status: "error"; message: string };

/**
 * 7단계 "도메인 객체(JSON)"의 임시 형태이다.
 * 좌표/크기 단위, 타입 enum 값은 백엔드 스키마 확정 전까지 가짜다.
 */
export interface BoothMapObject {
  id: string;
  type: "BOOTH" | "PATH" | "BUILDING" | "OPEN_SPACE" | "RESTROOM" | "ENTRANCE";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
