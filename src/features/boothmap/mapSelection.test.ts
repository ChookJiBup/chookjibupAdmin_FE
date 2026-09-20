import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boundsContainPoint,
  boundsFromCorners,
  boundsTouchPoints,
  deltaBetween,
  isNegligibleBounds,
  shiftPoint,
  shiftPoints,
  pointInPolygonPx,
  distanceToPolylinePx,
  lineUpPoints,
} from "./mapSelection";

const topLeft = { lat: 35.15, lng: 126.919 };
const bottomRight = { lat: 35.148, lng: 126.922 };
const box = boundsFromCorners(topLeft, bottomRight);

describe("mapSelection", () => {
  it("어느 방향으로 끌어도 같은 범위가 나온다", () => {
    assert.deepEqual(boundsFromCorners(bottomRight, topLeft), box);
    assert.deepEqual(box, { south: 35.148, west: 126.919, north: 35.15, east: 126.922 });
  });

  it("범위 안의 점은 고르고 밖의 점은 거른다", () => {
    assert.equal(boundsContainPoint(box, { lat: 35.149, lng: 126.9205 }), true);
    assert.equal(boundsContainPoint(box, { lat: 35.151, lng: 126.9205 }), false);
    assert.equal(boundsContainPoint(box, { lat: 35.149, lng: 126.918 }), false);
  });

  it("경계선 위의 점은 안으로 친다", () => {
    assert.equal(boundsContainPoint(box, { lat: 35.148, lng: 126.919 }), true);
    assert.equal(boundsContainPoint(box, { lat: 35.15, lng: 126.922 }), true);
  });

  it("꼭짓점 하나만 걸친 도형도 선택된다", () => {
    const halfIn = [
      { lat: 35.149, lng: 126.9215 },
      { lat: 35.149, lng: 126.93 },
      { lat: 35.1455, lng: 126.93 },
    ];
    assert.equal(boundsTouchPoints(box, halfIn), true);
  });

  it("완전히 벗어난 도형과 점 없는 도형은 선택되지 않는다", () => {
    const outside = [
      { lat: 35.16, lng: 126.93 },
      { lat: 35.161, lng: 126.931 },
    ];
    assert.equal(boundsTouchPoints(box, outside), false);
    assert.equal(boundsTouchPoints(box, []), false);
  });

  it("델타를 구해 그대로 적용하면 원래 목표 지점이 된다", () => {
    const delta = deltaBetween(topLeft, bottomRight);
    const moved = shiftPoint(topLeft, delta);
    assert.ok(Math.abs(moved.lat - bottomRight.lat) < 1e-12);
    assert.ok(Math.abs(moved.lng - bottomRight.lng) < 1e-12);
  });

  it("여러 점을 옮겨도 서로의 간격은 그대로다", () => {
    const points = [topLeft, bottomRight];
    const delta = { dLat: 0.001, dLng: -0.002 };
    const moved = shiftPoints(points, delta);
    assert.deepEqual(points, [topLeft, bottomRight]); // 원본은 건드리지 않는다
    assert.ok(Math.abs(moved[1].lat - moved[0].lat - (bottomRight.lat - topLeft.lat)) < 1e-12);
    assert.ok(Math.abs(moved[1].lng - moved[0].lng - (bottomRight.lng - topLeft.lng)) < 1e-12);
    assert.deepEqual(shiftPoints([], delta), []);
  });

  it("클릭에 가까운 미세한 드래그는 무시된다", () => {
    const jitter = boundsFromCorners(topLeft, { lat: 35.150005, lng: 126.919005 });
    assert.equal(isNegligibleBounds(jitter), true);
    assert.equal(isNegligibleBounds(box), false);
  });

  it("한쪽 변만 긴 가느다란 드래그는 무시하지 않는다", () => {
    const thin = boundsFromCorners(topLeft, { lat: 35.150005, lng: 126.921 });
    assert.equal(isNegligibleBounds(thin), false);
  });
});

describe("화면 좌표 판정", () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it("사각형 안팎을 가른다", () => {
    assert.equal(pointInPolygonPx(square, { x: 5, y: 5 }), true);
    assert.equal(pointInPolygonPx(square, { x: 15, y: 5 }), false);
  });

  it("점이 3개 미만이면 안에 있다고 보지 않는다", () => {
    assert.equal(pointInPolygonPx([{ x: 0, y: 0 }], { x: 0, y: 0 }), false);
  });

  it("꺾은선까지의 거리는 선분 위로 내린 수선이다", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    assert.equal(distanceToPolylinePx(line, { x: 5, y: 3 }), 3);
  });

  it("선분 밖으로 벗어나면 가까운 끝점까지의 거리다", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    assert.equal(distanceToPolylinePx(line, { x: 13, y: 4 }), 5);
  });

  it("점이 없는 선은 무한대로 둬 절대 집히지 않는다", () => {
    assert.equal(distanceToPolylinePx([], { x: 0, y: 0 }), Number.POSITIVE_INFINITY);
  });
});

describe("줄 세우기", () => {
  it("가로로 흩어진 점들을 양 끝 사이에 고르게 놓는다", () => {
    const lined = lineUpPoints([
      { lat: 35.15, lng: 126.9 },
      { lat: 35.1504, lng: 126.902 },
      { lat: 35.1498, lng: 126.904 },
    ]);
    // 양 끝은 그대로, 가운데는 두 끝의 한가운데로 온다.
    assert.deepEqual(lined[0], { lat: 35.15, lng: 126.9 });
    assert.deepEqual(lined[2], { lat: 35.1498, lng: 126.904 });
    assert.ok(Math.abs(lined[1].lng - 126.902) < 1e-12);
    assert.ok(Math.abs(lined[1].lat - (35.15 + 35.1498) / 2) < 1e-12);
  });

  it("세로로 늘어선 무리는 세로로 세운다", () => {
    const lined = lineUpPoints([
      { lat: 35.15, lng: 126.9 },
      { lat: 35.1515, lng: 126.9002 },
      { lat: 35.153, lng: 126.9 },
    ]);
    // 가운데 점의 경도가 양 끝의 한가운데(126.9)로 당겨진다 — 세로 축을 따라 섰다는 뜻.
    assert.ok(Math.abs(lined[1].lng - 126.9) < 1e-12);
  });

  it("점이 2개 이하면 그대로 둔다", () => {
    const two = [
      { lat: 35.15, lng: 126.9 },
      { lat: 35.16, lng: 126.91 },
    ];
    assert.deepEqual(lineUpPoints(two), two);
    assert.deepEqual(lineUpPoints([]), []);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const points = [
      { lat: 35.15, lng: 126.9 },
      { lat: 35.1504, lng: 126.902 },
      { lat: 35.1498, lng: 126.904 },
    ];
    lineUpPoints(points);
    assert.equal(points[1].lat, 35.1504);
  });
});
