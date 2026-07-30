import type { FestivalSummary } from "./types";

/**
 * 관리자별 축제 목록 상태 조회 API가 아직 백엔드에 없어 임시로 사용하는 더미 데이터.
 * API가 준비되면 이 상수 대신 실제 조회 결과로 교체한다.
 */
export const MOCK_FESTIVALS: FestivalSummary[] = [
  {
    festivalId: "mock-1",
    name: "김천김밥축제",
    role: "FESTIVAL_OWNER",
    status: "UPCOMING",
    startDate: "2026-10-23",
    endDate: "2026-10-25",
    dDayLabel: "D-88",
  },
  {
    festivalId: "mock-2",
    name: "김천김밥축제",
    role: "SUB_ADMIN",
    status: "UPCOMING",
    startDate: "2026-10-23",
    endDate: "2026-10-25",
    dDayLabel: "D-88",
  },
  {
    festivalId: "mock-3",
    name: "김천김밥축제",
    role: "SUB_ADMIN",
    status: "ONGOING",
    startDate: "2026-10-23",
    endDate: "2026-10-25",
  },
  {
    festivalId: "mock-4",
    name: "김천김밥축제",
    role: "FESTIVAL_OWNER",
    status: "COMPLETED",
    startDate: "2025-10-25",
    endDate: "2025-10-26",
  },
];
