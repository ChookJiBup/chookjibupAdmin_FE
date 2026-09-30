import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsPoint,
  hasSelfIntersection,
  newPinPlacementError,
  polygonArea,
  uniqueVertices,
  validateBoundary,
  withoutClosingDuplicate,
} from "./polygonGeometry";

describe("polygonGeometry", () => {
  it("중간의 중복점과 유효하지 않은 좌표를 임의로 고치지 않는다", () => {
    const a = { lat: 37.5, lng: 127 },
      b = { lat: 37.51, lng: 127 };
    const c = { lat: 37.51, lng: 127.01 };
    assert.notEqual(validateBoundary([a, b, a, c]), null);
    assert.notEqual(validateBoundary([a, b, { lat: NaN, lng: 127 }]), null);
  });
  it("닫는 중복 점을 제거하고 렌더러가 닫도록 둔다", () => {
    const points = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
      { lat: 0, lng: 0 },
    ];
    assert.equal(withoutClosingDuplicate(points).length, 3);
  });

  it("면적 0과 자기 교차를 거절한다", () => {
    assert.notEqual(
      validateBoundary([
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
      ]),
      null,
    );
    assert.equal(
      polygonArea([
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 0, lng: 2 },
      ]),
      0,
    );
    assert.equal(
      hasSelfIntersection([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 0 },
      ]),
      true,
    );
    assert.equal(
      validateBoundary([
        { lat: 37.5, lng: 127.0 },
        { lat: 37.5, lng: 127.01 },
        { lat: 37.51, lng: 127.01 },
        { lat: 37.51, lng: 127.0 },
      ]),
      null,
    );
  });

  it("중복 꼭짓점을 고유 점으로 줄인다", () => {
    assert.equal(
      uniqueVertices([
        { lat: 1, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ]).length,
      2,
    );
  });
});

describe("containsPoint", () => {
  const square = [
    { lat: 1, lng: 1 },
    { lat: 1, lng: 3 },
    { lat: 3, lng: 3 },
    { lat: 3, lng: 1 },
  ];

  it("폴리곤 안의 점을 안쪽으로 본다", () => {
    assert.equal(containsPoint(square, { lat: 2, lng: 2 }), true);
  });

  it("폴리곤 밖의 점을 바깥으로 본다", () => {
    assert.equal(containsPoint(square, { lat: 4, lng: 2 }), false);
    assert.equal(containsPoint(square, { lat: 2, lng: 0.5 }), false);
  });

  it("경계선과 꼭지점 위의 점을 안쪽으로 본다", () => {
    assert.equal(containsPoint(square, { lat: 2, lng: 1 }), true);
    assert.equal(containsPoint(square, { lat: 2, lng: 3 }), true);
    assert.equal(containsPoint(square, { lat: 1, lng: 2 }), true);
    assert.equal(containsPoint(square, { lat: 3, lng: 2 }), true);
    assert.equal(containsPoint(square, { lat: 1, lng: 1 }), true);
  });

  it("꼭짓점이 3개 미만이면 항상 바깥이다", () => {
    assert.equal(containsPoint(square.slice(0, 2), { lat: 2, lng: 2 }), false);
  });
});

describe("newPinPlacementError", () => {
  const boundary = [
    { lat: 1, lng: 1 },
    { lat: 1, lng: 3 },
    { lat: 3, lng: 3 },
    { lat: 3, lng: 1 },
  ];

  it("저장된 경계가 없으면 종류와 관계없이 신규 핀을 만들 수 없다", () => {
    assert.equal(
      newPinPlacementError(null, { lat: 2, lng: 2 }),
      "부지 경계를 먼저 그리고 저장해 주세요.",
    );
    assert.equal(
      newPinPlacementError(boundary.slice(0, 2), { lat: 2, lng: 2 }),
      "부지 경계를 먼저 그리고 저장해 주세요.",
    );
  });

  it("저장된 경계 안과 경계선 위에서만 신규 핀을 허용한다", () => {
    assert.equal(newPinPlacementError(boundary, { lat: 2, lng: 2 }), null);
    assert.equal(newPinPlacementError(boundary, { lat: 2, lng: 1 }), null);
    assert.equal(
      newPinPlacementError(boundary, { lat: 4, lng: 2 }),
      "부지 경계 밖에는 핀을 추가할 수 없습니다.",
    );
  });
});
