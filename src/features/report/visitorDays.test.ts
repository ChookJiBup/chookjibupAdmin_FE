import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FestivalVisitorCounts, FestivalVisitorDay } from "./types";
import { missingPastVisitorDays, todayIsoDate } from "./visitorDays";

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

  it("총합 집계나 미설정 축제는 일자별로 묻지 않는다", () => {
    assert.deepEqual(
      missingPastVisitorDays(
        counts({ days: allDays, visitorCountInputMode: "TOTAL" }),
        "2026-05-05",
      ),
      [],
    );
    assert.deepEqual(
      missingPastVisitorDays(
        counts({ days: allDays, visitorCountInputMode: "UNSET" }),
        "2026-05-05",
      ),
      [],
    );
  });

  it("조회 실패로 값이 없으면 게이트를 걸지 않는다", () => {
    assert.deepEqual(missingPastVisitorDays(undefined, "2026-05-05"), []);
  });
});
