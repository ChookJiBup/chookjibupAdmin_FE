import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRealDate } from "./dateFormat";

describe("isRealDate", () => {
  it("달력에 있는 날짜만 통과시킨다", () => {
    assert.equal(isRealDate("2026.11.25"), true);
    assert.equal(isRealDate("2028.02.29"), true);
  });

  it("형식은 맞지만 없는 날짜는 막는다", () => {
    // 형식만 보던 시절에는 이 값이 등록 확인 모달까지 넘어갔다.
    assert.equal(isRealDate("2026.13.45"), false);
    assert.equal(isRealDate("2026.02.30"), false);
    assert.equal(isRealDate("2026.00.10"), false);
  });

  it("형식이 어긋나면 막는다", () => {
    assert.equal(isRealDate("2026-11-25"), false);
    assert.equal(isRealDate("2026.1.5"), false);
    assert.equal(isRealDate(""), false);
  });
});
