import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { moveBoothsToNewZone, selectGroupableBooths } from "./zoneGrouping.ts";

function pin(id, overrides = {}) {
  return {
    id,
    nodeId: `node-${id}`,
    name: id,
    nodeType: "BOOTH",
    lat: 37.5,
    lng: 127,
    ...overrides,
  };
}

describe("booth zone grouping", () => {
  it("선택한 모든 부스를 새 구역에 저장한다", () => {
    const booths = [pin("a"), pin("b"), pin("c")];
    const selected = selectGroupableBooths(booths, ["a", "b", "c"]);
    const result = moveBoothsToNewZone([], {
      id: "new-zone",
      name: "새 구역",
      boothIds: selected.map(({ id }) => id),
    });
    assert.deepEqual(result[0].boothIds, ["a", "b", "c"]);
  });

  it("기존 그룹의 부스를 새 그룹으로 옮기고 중복 소속을 남기지 않는다", () => {
    const result = moveBoothsToNewZone(
      [
        { id: "old-a", name: "기존 A", boothIds: ["a", "b"] },
        { id: "old-b", name: "기존 B", boothIds: ["c", "d"] },
      ],
      { id: "new", name: "새 구역", boothIds: ["b", "c", "c"] },
    );
    assert.deepEqual(result, [
      { id: "old-a", name: "기존 A", boothIds: ["a"] },
      { id: "old-b", name: "기존 B", boothIds: ["d"] },
      { id: "new", name: "새 구역", boothIds: ["b", "c"] },
    ]);
    const memberships = result.flatMap((zone) => zone.boothIds);
    assert.equal(memberships.length, new Set(memberships).size);
  });

  it("부스와 시설을 함께 선택해도 부스만 그룹 대상으로 남긴다", () => {
    const booths = [
      pin("booth-a"),
      pin("booth-b"),
      pin("restroom", { nodeType: "RESTROOM" }),
      pin("entrance", { nodeType: "ENTRANCE" }),
    ];
    assert.deepEqual(
      selectGroupableBooths(
        booths,
        booths.map(({ id }) => id),
      ).map(({ id }) => id),
      ["booth-a", "booth-b"],
    );
  });
});
