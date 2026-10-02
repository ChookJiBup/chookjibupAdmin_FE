import type { VisitPatternRow } from "./charts/VisitPatternHeatmap";

export const MOCK_BADGE_LABEL = "예시 데이터";

/** 시간대별 방문객 API가 생기기 전까지 화면 구조를 확인하기 위한 예시 데이터다. */
export function createMockVisitPatternRows(totalDayCount: number): VisitPatternRow[] {
  return Array.from({ length: Math.max(1, totalDayCount) }, (_, index) => index + 1).map(
    (dayIndex) => ({
      dayIndex,
      hours: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((hour) => ({
        hour,
        visitorCount: Math.round(
          120 +
            dayIndex * 40 +
            260 * Math.exp(-((hour - 12) ** 2) / 4) +
            340 * Math.exp(-((hour - 18) ** 2) / 5),
        ),
      })),
    }),
  );
}
