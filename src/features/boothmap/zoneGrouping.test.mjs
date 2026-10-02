import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boundaryContainsPoint,
  groupBoundary,
  moveBoothsToNewZone,
  selectGroupableBooths,
} from "./zoneGrouping.ts";

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

  it("화장실·입구 등 비부스는 그룹 대상에서 제외한다", () => {
    const booths = [
      pin("booth"),
      pin("restroom", { nodeType: "RESTROOM" }),
      pin("entrance", { nodeType: "ENTRANCE" }),
    ];
    assert.deepEqual(
      selectGroupableBooths(
        booths,
        booths.map(({ id }) => id),
      ).map(({ id }) => id),
      ["booth"],
    );
  });

  it("멀리 떨어진 부스를 포함해 선택한 모든 좌표가 그룹 경계 안에 든다", () => {
    const members = [
      pin("west", { lat: 37.41, lng: 126.72 }),
      pin("north", { lat: 37.89, lng: 127.01 }),
      pin("east", { lat: 37.52, lng: 127.63 }),
      pin("south", { lat: 36.98, lng: 127.22 }),
    ];
    const boundary = groupBoundary(members);
    assert.equal(boundary.length, 4);
    members.forEach((member) => assert.equal(boundaryContainsPoint(boundary, member), true));
  });

  it("서로 다른 100개 좌표 배치에서도 모든 부스가 경계 안에 남는다", () => {
    let seed = 20261002;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let scenario = 0; scenario < 100; scenario += 1) {
      const count = 2 + Math.floor(random() * 19);
      const members = Array.from({ length: count }, (_, index) =>
        pin(`${scenario}-${index}`, {
          lat: 33 + random() * 6,
          lng: 124 + random() * 8,
        }),
      );
      const boundary = groupBoundary(members);
      assert.equal(
        members.every((member) => boundaryContainsPoint(boundary, member)),
        true,
        `scenario ${scenario}`,
      );
    }
  });
});
