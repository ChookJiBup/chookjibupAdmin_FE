import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FestivalVisitorCounts, FestivalVisitorDay } from "./types";
import { elapsedVisitorDays, missingPastVisitorDays, todayIsoDate } from "./visitorDays";

function day(overrides: Partial<FestivalVisitorDay> & { visitDate: string }): FestivalVisitorDay {
  return {
    dayIndex: 1,
    visitorCount: null,
    inputAllowed: true,
    saved: false,
    ...overrides,
  };
}

function counts(overrides: Partial<FestivalVisitorCounts> = {}): FestivalVisitorCounts {
  return {
    festivalId: "f1",
    startDate: "2026-05-01",
    endDate: "2026-05-04",
    visitorCountInputMode: "DAILY",
    days: [],
    filledDayCount: 0,
    totalDayCount: 0,
    allDaysFilled: false,
    sumVisitorCount: 0,
    totalOverrideVisitorCount: null,
    totalSaved: false,
    effectiveVisitorCount: null,
    effectiveSource: "NONE",
    effectiveStatus: "UNSET",
    difference: null,
    reportReadyToGenerate: false,
    ...overrides,
  };
}

describe("todayIsoDate", () => {
  it("로컬 달력 날짜를 yyyy-MM-dd로 만든다", () => {
    // 시간대를 UTC로 못박아 읽으면 한국에서 오전 9시 이전에 하루가 밀린다.
    assert.equal(todayIsoDate(new Date(2026, 4, 3, 2, 30)), "2026-05-03");
    assert.equal(todayIsoDate(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  });
});

describe("missingPastVisitorDays", () => {
  const allDays = [
    day({ visitDate: "2026-05-01", dayIndex: 1, visitorCount: 100, saved: true }),
    day({ visitDate: "2026-05-02", dayIndex: 2 }),
    day({ visitDate: "2026-05-03", dayIndex: 3, inputAllowed: false }),
    day({ visitDate: "2026-05-04", dayIndex: 4 }),
  ];

  it("지나간 날 중 비어 있고 입력이 허용된 날만 고른다", () => {
    const missing = missingPastVisitorDays(counts({ days: allDays }), "2026-05-04");
    assert.deepEqual(
      missing.map((entry) => entry.dayIndex),
      [2],
    );
  });

  it("오늘과 아직 오지 않은 날은 누락으로 치지 않는다", () => {
    const missing = missingPastVisitorDays(counts({ days: allDays }), "2026-05-02");
    assert.deepEqual(missing, []);
  });

  it("총합 집계 축제는 일자별로 묻지 않는다", () => {
    assert.deepEqual(
      missingPastVisitorDays(
        counts({ days: allDays, visitorCountInputMode: "TOTAL" }),
        "2026-05-05",
      ),
      [],
    );
  });

  it("집계 방식이 아직 정해지지 않은 축제도 일자별로 묻는다", () => {
    // 진행 중 축제는 첫 입력 전까지 UNSET이다. 여기서 빼면 물음이 영영 뜨지 않는다.
    const missing = missingPastVisitorDays(
      counts({ days: allDays, visitorCountInputMode: "UNSET" }),
      "2026-05-05",
    );
    assert.deepEqual(
      missing.map((entry) => entry.dayIndex),
      [2, 4],
    );
  });

  it("조회 실패로 값이 없으면 게이트를 걸지 않는다", () => {
    assert.deepEqual(missingPastVisitorDays(undefined, "2026-05-05"), []);
  });
});

describe("elapsedVisitorDays", () => {
  const allDays = [
    day({ visitDate: "2026-05-01", dayIndex: 1, visitorCount: 100, saved: true }),
    day({ visitDate: "2026-05-02", dayIndex: 2 }),
    day({ visitDate: "2026-05-03", dayIndex: 3, inputAllowed: false }),
    day({ visitDate: "2026-05-04", dayIndex: 4 }),
  ];

  it("하루가 끝난 일차는 이미 채운 날까지 모두 돌려준다", () => {
    // 모달은 누적으로 보여 준다 — 1일차(입력됨)와 2일차(빈칸)가 함께 떠야 한다.
    const elapsed = elapsedVisitorDays(counts({ days: allDays }), "2026-05-03");
    assert.deepEqual(
      elapsed.map((entry) => entry.dayIndex),
      [1, 2],
    );
  });

  it("오늘과 아직 마감되지 않은 날은 빼고, 다음 날이 되어야 들어온다", () => {
    assert.deepEqual(elapsedVisitorDays(counts({ days: allDays }), "2026-05-01"), []);
    assert.deepEqual(
      elapsedVisitorDays(counts({ days: allDays }), "2026-05-02").map((entry) => entry.dayIndex),
      [1],
    );
    // 3일차는 visitDate가 지났어도 inputAllowed가 false라 서버가 아직 안 받는다.
    assert.deepEqual(
      elapsedVisitorDays(counts({ days: allDays }), "2026-05-05").map((entry) => entry.dayIndex),
      [1, 2, 4],
    );
  });
});
