import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  consumeBoothMapGuide,
  getBoothMapGuideStorageKey,
  // Node의 내장 TypeScript 테스트 러너는 파일 확장자가 있어야 모듈을 찾는다.
  // @ts-expect-error 테스트를 빌드하지 않으므로 런타임 해석 방식을 우선한다.
} from "./boothMapGuidePreference.ts";

describe("boothMapGuidePreference", () => {
  it("등록 직후 첫 진입 신호를 소비하면 축제별 seen을 바로 저장한다", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    assert.equal(consumeBoothMapGuide(storage, "festival-1"), true);
    assert.equal(values.get(getBoothMapGuideStorageKey("festival-1")), "true");
  });

  it("새로고침하거나 재진입하면 같은 축제 가이드를 자동 재노출하지 않는다", () => {
    const storage = { getItem: () => "true", setItem: () => undefined };
    assert.equal(consumeBoothMapGuide(storage, "festival-1"), false);
  });

  it("다른 축제는 각각 첫 진입 가이드를 볼 수 있다", () => {
    const firstFestivalKey = getBoothMapGuideStorageKey("festival-1");
    const storage = {
      getItem: (key: string) => (key === firstFestivalKey ? "true" : null),
      setItem: () => undefined,
    };
    assert.equal(consumeBoothMapGuide(storage, "festival-2"), true);
  });
});
