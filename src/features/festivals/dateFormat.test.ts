import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDateInput,
  hasFestivalPeriodError,
  isRealDate,
  normalizeDisplayDate,
  toCalendarDate,
  toDisplayDate,
  toIsoDate,
  toIsoDateString,
  validateFestivalPeriod,
} from "./dateFormat";

describe("isRealDate", () => {
  it("달력에 있는 날짜만 통과시킨다", () => {
    assert.equal(isRealDate("2026-11-25"), true);
    // 2028년은 윤년이라 2월 29일이 있다.
    assert.equal(isRealDate("2028-02-29"), true);
  });

  it("형식은 맞지만 없는 날짜는 막는다", () => {
    // 형식만 보던 시절에는 이 값이 등록 확인 모달까지 넘어갔다.
    assert.equal(isRealDate("2026-13-45"), false);
    assert.equal(isRealDate("2026-02-30"), false);
    assert.equal(isRealDate("2026-02-31"), false);
    assert.equal(isRealDate("2026-00-10"), false);
    // 2026년은 윤년이 아니다.
    assert.equal(isRealDate("2026-02-29"), false);
  });

  it("형식이 어긋나면 막는다", () => {
    assert.equal(isRealDate("2026.11.25"), false);
    assert.equal(isRealDate("2026-1-5"), false);
    assert.equal(isRealDate(""), false);
  });
});

describe("normalizeDisplayDate", () => {
  it("마침표·슬래시 구분자를 하이픈으로 바꾼다", () => {
    assert.equal(normalizeDisplayDate("2026.09.20"), "2026-09-20");
    assert.equal(normalizeDisplayDate("2026/09/20"), "2026-09-20");
  });

  it("한 자리 월·일을 두 자리로 0 채움 한다", () => {
    assert.equal(normalizeDisplayDate("2026-9-5"), "2026-09-05");
    assert.equal(normalizeDisplayDate("2026.9.5"), "2026-09-05");
  });

  it("날짜로 읽히지 않으면 원문을 그대로 둔다", () => {
    assert.equal(normalizeDisplayDate(""), "");
    assert.equal(normalizeDisplayDate("미정"), "미정");
  });

  it("toDisplayDate와 toIsoDate는 같은 형식으로 수렴한다", () => {
    assert.equal(toDisplayDate("2026-09-20"), "2026-09-20");
    assert.equal(toIsoDate("2026.09.20"), "2026-09-20");
  });
});

describe("toCalendarDate", () => {
  it("날짜+시각 문자열에서 달력 날짜만 뽑는다", () => {
    assert.equal(toCalendarDate("2026-09-20T00:00:00"), "2026-09-20");
  });

  it("자정 직전 시각이어도 날짜가 하루 밀리지 않는다", () => {
    // UTC로 읽으면 한국 시간 2026-09-21 08:59가 되어 하루가 밀리던 값이다.
    assert.equal(toCalendarDate("2026-09-20T23:59:59.999999999"), "2026-09-20");
  });

  it("날짜만 있는 값과 잘못된 값은 손대지 않는다", () => {
    assert.equal(toCalendarDate("2026-09-20"), "2026-09-20");
    assert.equal(toCalendarDate("알 수 없음"), "알 수 없음");
  });
});

describe("toIsoDateString", () => {
  it("로컬 달력 기준으로 0을 채워 적는다", () => {
    assert.equal(toIsoDateString(new Date(2026, 8, 5)), "2026-09-05");
  });

  it("자정 경계에서도 그날 날짜를 유지한다", () => {
    assert.equal(toIsoDateString(new Date(2026, 8, 20, 0, 0, 0)), "2026-09-20");
    assert.equal(toIsoDateString(new Date(2026, 8, 20, 23, 59, 59)), "2026-09-20");
  });
});

describe("formatDateInput", () => {
  it("숫자만 남겨 하이픈으로 끊어 준다", () => {
    assert.equal(formatDateInput("20260920"), "2026-09-20");
    assert.equal(formatDateInput("2026.09.20"), "2026-09-20");
  });

  it("타이핑 도중에는 친 만큼만 만든다", () => {
    assert.equal(formatDateInput("2026"), "2026");
    assert.equal(formatDateInput("20260"), "2026-0");
    assert.equal(formatDateInput(""), "");
  });

  it("8자리를 넘는 숫자는 잘라 낸다", () => {
    assert.equal(formatDateInput("2026092012"), "2026-09-20");
  });
});

describe("validateFestivalPeriod", () => {
  it("올바른 기간은 오류가 없다", () => {
    const errors = validateFestivalPeriod("2026-09-20", "2026-09-22");
    assert.deepEqual(errors, { startDate: null, endDate: null });
    assert.equal(hasFestivalPeriodError(errors), false);
  });

  it("하루짜리 축제(시작 == 종료)는 통과시킨다", () => {
    assert.equal(hasFestivalPeriodError(validateFestivalPeriod("2026-09-20", "2026-09-20")), false);
  });

  it("시작날짜가 종료날짜보다 뒤면 종료날짜 칸에 오류를 붙인다", () => {
    const errors = validateFestivalPeriod("2026-09-22", "2026-09-20");
    assert.equal(errors.startDate, null);
    assert.equal(errors.endDate, "종료날짜는 시작날짜보다 빠를 수 없습니다.");
  });

  it("형식이 어긋나면 그 칸에 형식 오류를 붙인다", () => {
    const errors = validateFestivalPeriod("2026.09.20", "2026-9-5");
    assert.match(errors.startDate ?? "", /yyyy-MM-dd/);
    assert.match(errors.endDate ?? "", /yyyy-MM-dd/);
  });

  it("달력에 없는 날짜(2월 31일)는 형식 오류로 막는다", () => {
    const errors = validateFestivalPeriod("2026-02-31", "2026-03-01");
    assert.match(errors.startDate ?? "", /실제 날짜/);
    assert.equal(errors.endDate, null);
  });

  it("윤년 2월 29일은 2028년만 통과한다", () => {
    assert.equal(validateFestivalPeriod("2028-02-29", "2028-03-01").startDate, null);
    assert.notEqual(validateFestivalPeriod("2026-02-29", "2026-03-01").startDate, null);
  });

  it("빈 값은 각 칸에 입력을 요청한다", () => {
    const errors = validateFestivalPeriod("", "");
    assert.equal(errors.startDate, "시작날짜를 입력해 주세요.");
    assert.equal(errors.endDate, "종료날짜를 입력해 주세요.");
  });

  it("한쪽만 비어 있으면 그 칸만 오류가 난다", () => {
    const errors = validateFestivalPeriod("2026-09-20", "");
    assert.equal(errors.startDate, null);
    assert.equal(errors.endDate, "종료날짜를 입력해 주세요.");
  });
});
