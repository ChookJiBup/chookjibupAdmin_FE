import type { AiSuggestion, Booth, BoothZone, DashboardSummary, CongestionLevel } from "./types";

/** 직지문화공원(김천) 중심 좌표. 실제 축제부스맵 좌표 API가 아직 없어 임시로 이 주변에 흩뿌린다. */
export const FESTIVAL_MAP_CENTER = { lat: 36.1398, lng: 128.017 };

const LEVELS: CongestionLevel[] = ["LOW", "MEDIUM", "HIGH"];

function scatter(index: number, seed: number) {
  const angle = (index * 47 + seed * 13) % 360;
  const radius = 0.0009 + ((index * 7 + seed) % 5) * 0.00035;
  const rad = (angle * Math.PI) / 180;
  return {
    lat: FESTIVAL_MAP_CENTER.lat + Math.cos(rad) * radius,
    lng: FESTIVAL_MAP_CENTER.lng + Math.sin(rad) * radius,
  };
}

function buildBooths(zoneId: string, zoneName: string, names: string[], seed: number): Booth[] {
  return names.map((name, index) => {
    const level = LEVELS[(index + seed) % LEVELS.length];
    const { lat, lng } = scatter(index, seed);
    return {
      boothId: `${zoneId}-${index + 1}`,
      name,
      zoneId,
      lat,
      lng,
      congestionLevel: level,
      waitMinutes: 5 + ((index * 3 + seed) % 40),
      updatedMinutesAgo: 1 + ((index + seed) % 12),
      lastQueueUpdater: { name: "이용", role: "STAFF" },
      queueZones: ["존 1", "존 2", "존 3"],
    } satisfies Booth;
  });
}

export const MOCK_ZONES: BoothZone[] = [
  {
    zoneId: "event-gimbap",
    name: "이벤트김밥존",
    booths: buildBooths(
      "event-gimbap",
      "이벤트김밥존",
      [
        "꼬달이 놀이터",
        "부스명1",
        "꼬달이 에어돔",
        "보조무대",
        "체험부스",
        "프랜차이즈 김밥",
        "후원이벤트 부스",
        "포토존",
        "이벤트 무대",
        "경품 추첨소",
        "안내데스크",
        "굿즈 판매부스",
      ],
      1,
    ),
  },
  {
    zoneId: "unique-gimbap",
    name: "이색김밥존",
    booths: buildBooths(
      "unique-gimbap",
      "이색김밥존",
      [
        "매운김밥 부스",
        "치즈김밥 부스",
        "불고기김밥 부스",
        "야채김밥 부스",
        "참치김밥 부스",
        "새우김밥 부스",
        "돈까스김밥 부스",
        "묶음김밥 부스",
      ],
      2,
    ),
  },
  {
    zoneId: "local-premium-gimbap",
    name: "명품로컬김밥존",
    booths: buildBooths(
      "local-premium-gimbap",
      "명품로컬김밥존",
      [
        "1(주)대정 김밥공장",
        "김천 로컬푸드 김밥",
        "직지 명인김밥",
        "전통시장 김밥",
        "농협 로컬김밥",
        "황악산 김밥",
        "직지사 김밥",
        "김천포도 김밥",
        "자두마을 김밥",
        "특산물 김밥",
      ],
      3,
    ),
  },
];

export const MOCK_SUMMARY: DashboardSummary = {
  overallCongestion: "LOW",
  estimatedWaitMinutes: 5,
  busiestBoothName: "1(주)대정 김밥공장",
  dailyVisitorCount: 328,
  totalVisitorCount: 4927,
};

export const MOCK_AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "ai-1",
    title: "프랜차이즈 김밥 구역이 혼잡합니다",
    description: "인접한 이색김밥존으로 안내 표지판을 배치하는 것을 추천합니다.",
  },
];

export function getTotalBoothCount(zones: BoothZone[]): number {
  return zones.reduce((sum, zone) => sum + zone.booths.length, 0);
}
