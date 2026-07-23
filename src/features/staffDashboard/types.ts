export type CongestionLevel = "LOW" | "MEDIUM" | "HIGH";

export interface BoothCongestion {
  boothId: string;
  boothName: string;
  congestionLevel: CongestionLevel;
  /** 대기열 끝 위치 — 부스 앞 기준 상대 거리(m). 좌표 형식이 확정되면 교체한다. */
  queueTailDistanceMeters: number;
}
