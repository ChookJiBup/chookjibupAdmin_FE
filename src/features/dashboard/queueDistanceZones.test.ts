import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQueueZones, queueTailPointOnPath, QUEUE_ZONE_METERS } from "./queueDistanceZones";

/** 위도 1도는 약 111,320m이므로, 북쪽으로 곧게 뻗은 줄을 만들어 길이를 다루기 쉽게 둔다. */
const METER_IN_DEGREES = 1 / 111_320;
const START = { lat: 37.5, lng: 127.0 };
const straightPath = (meters: number) => [
  START,
  { lat: START.lat + meters * METER_IN_DEGREES, lng: START.lng },
];

describe("buildQueueZones", () => {
  it("사전 동선이 없으면 눈대중 20칸을 준다", () => {
    const zones = buildQueueZones(null);
    assert.equal(zones.length, 21);
    assert.deepEqual(zones[0], { id: "0", label: "줄 없음", meters: 0 });
    assert.equal(zones.at(-1)?.meters, 20 * QUEUE_ZONE_METERS);
  });

  it("사전 동선이 있으면 그 줄 길이까지만 만든다", () => {
    // 실제로 설 수 없는 길이를 고를 수 있으면 보고 자체가 틀어진다.
    const zones = buildQueueZones(60);
    assert.deepEqual(
      zones.map((zone) => zone.meters),
      [0, 10, 20, 30, 40, 50, 60],
    );
  });

  it("10m로 떨어지지 않는 줄은 마지막 칸을 줄 끝에 맞춘다", () => {
    assert.deepEqual(
      buildQueueZones(45).map((zone) => zone.meters),
      [0, 10, 20, 30, 40, 45],
    );
  });

  it("한 칸보다 짧은 줄도 고를 칸을 하나는 남긴다", () => {
    assert.deepEqual(
      buildQueueZones(4).map((zone) => zone.meters),
      [0, 4],
    );
  });

  it("길이를 알 수 없는 값은 눈대중으로 되돌린다", () => {
    for (const length of [undefined, null, 0, -5, Number.NaN]) {
      assert.equal(buildQueueZones(length).length, 21, `${length}`);
    }
  });
});

describe("queueTailPointOnPath", () => {
  it("줄 없음은 동선 시작점을 가리킨다", () => {
    assert.deepEqual(queueTailPointOnPath(straightPath(60), 0), START);
  });

  it("고른 존만큼 줄을 따라간 지점을 찾는다", () => {
    const point = queueTailPointOnPath(straightPath(60), 30);
    assert.ok(Math.abs((point.lat - START.lat) / METER_IN_DEGREES - 30) < 0.5);
    assert.equal(point.lng, START.lng);
  });

  it("꺾인 줄은 꺾인 구간을 지나 이어서 잰다", () => {
    // 북쪽 20m 뒤 동쪽으로 꺾이는 줄에서 30m 지점은 꺾인 뒤 10m 자리다.
    const corner = { lat: START.lat + 20 * METER_IN_DEGREES, lng: START.lng };
    const east = {
      lat: corner.lat,
      lng: corner.lng + (30 * METER_IN_DEGREES) / Math.cos((corner.lat * Math.PI) / 180),
    };
    const point = queueTailPointOnPath([START, corner, east], 30);
    assert.ok(Math.abs(point.lat - corner.lat) < 1e-9, "꺾인 뒤에는 위도가 그대로다");
    assert.ok(point.lng > corner.lng && point.lng < east.lng);
  });

  it("줄보다 긴 거리는 줄 끝에서 멈춘다", () => {
    const path = straightPath(60);
    assert.deepEqual(queueTailPointOnPath(path, 500), path[1]);
  });

  it("빈 동선은 계산하지 않는다", () => {
    assert.throws(() => queueTailPointOnPath([], 10));
  });
});
