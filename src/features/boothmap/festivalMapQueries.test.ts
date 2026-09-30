import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { festivalMapInvalidationKeys, festivalMapKeys } from "./festivalMapQueries";

describe("festivalMapQueries", () => {
  it("대시보드와 편집기가 현재 지도 캐시를 공유한다", () => {
    assert.deepEqual(festivalMapKeys.current("12"), ["coordinate-map", "12"]);
  });

  it("부스맵 저장 후 양쪽 화면의 모든 서버 투영을 무효화한다", () => {
    const keys = festivalMapInvalidationKeys("12").map((key) => key[0]);
    assert.deepEqual(keys, [
      "coordinate-map",
      "map-editor",
      "boothmap-editor",
      "festival-dashboard",
      "festival-operations-map",
      "festival-queues",
      "festival-congestion",
    ]);
    assert.deepEqual(festivalMapKeys.editor("12"), ["map-editor", "12"]);
    assert.deepEqual(festivalMapKeys.editor("12", "34"), ["map-editor", "12", "34"]);
  });
});
