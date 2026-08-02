export type CongestionLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Booth {
  boothId: string;
  name: string;
  zoneId: string;
  /** Kakao 지도 위 부스 핀 좌표. */
  lat: number;
  lng: number;
  congestionLevel: CongestionLevel;
  /** 예상 대기 시간(분). */
  waitMinutes: number;
  /** 혼잡도 정보가 마지막으로 갱신된 시각(분 전). */
  updatedMinutesAgo: number;
  /** 대기열 끝(줄끝)을 마지막으로 갱신한 사람. */
  lastQueueUpdater: { name: string; role: "STAFF" | "OPERATOR" };
  /** 줄끝 갱신 시 선택 가능한 구역(존) 목록. */
  queueZones: string[];
}

export interface BoothZone {
  zoneId: string;
  name: string;
  booths: Booth[];
}

export interface DashboardSummary {
  overallCongestion: CongestionLevel;
  estimatedWaitMinutes: number;
  busiestBoothName: string;
  dailyVisitorCount: number;
  totalVisitorCount: number;
}

export interface AiSuggestion {
  id: string;
  title: string;
  description: string;
  /** 제안 내용을 지도 위에 경로선으로 보여줄 때의 경유 좌표(있을 때만 그린다). */
  path?: { lat: number; lng: number }[];
}
