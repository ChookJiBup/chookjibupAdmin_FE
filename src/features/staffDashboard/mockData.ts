import type { BoothCongestion } from "./types";

/**
 * TODO: 실제 조회/수정 API로 교체한다. 스태프용 혼잡도 조회, 줄끝라인 수정 API가
 * demoAdmin_BE에 아직 없다 (2026-07-23 기준). 좌표/거리 데이터 형식도 미확정이라
 * 임시로 부스 앞 거리(m)만 흉내낸다.
 */
export function getMockBoothCongestion(): BoothCongestion[] {
  return [
    {
      boothId: "booth-1",
      boothName: "부스 1 - 새우젓 시식",
      congestionLevel: "HIGH",
      queueTailDistanceMeters: 24,
    },
    {
      boothId: "booth-2",
      boothName: "부스 2 - 전통주 체험",
      congestionLevel: "MEDIUM",
      queueTailDistanceMeters: 12,
    },
    {
      boothId: "booth-3",
      boothName: "부스 3 - 기념품 판매",
      congestionLevel: "LOW",
      queueTailDistanceMeters: 3,
    },
  ];
}

export async function mockUpdateQueueTail(boothId: string, distanceMeters: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  void boothId;
  void distanceMeters;
}
