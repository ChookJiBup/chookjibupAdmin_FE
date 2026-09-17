import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pathLengthMeters,
  polygonAreaSquareMeters,
  presetPolygonPoints,
  straightenLine,
} from "./shapeGeometry";

const triangle = [
  { lat: 35.1495, lng: 126.9195 },
  { lat: 35.1499, lng: 126.9195 },
  { lat: 35.1497, lng: 126.92 },
];

describe("shapeGeometry", () => {
  it("삼각형을 사각형·원형으로 바꾸면 꼭짓점 수만 바뀌고 중심은 유지된다", () => {
    const square = presetPolygonPoints(triangle, "square");
    const circle = presetPolygonPoints(triangle, "circle");
    assert.equal(square.length, 4);
    assert.equal(circle.length, 16);
    const centerLat = triangle.reduce((sum, p) => sum + p.lat, 0) / 3;
    const squareCenterLat = square.reduce((sum, p) => sum + p.lat, 0) / 4;
    assert.ok(Math.abs(centerLat - squareCenterLat) < 1e-9);
  });

  it("사각형은 긴 변 기준 정사각형 면적을 가진다", () => {
    const square = presetPolygonPoints(triangle, "square");
    const side = pathLengthMeters([square[0], square[1]]);
    assert.ok(Math.abs(polygonAreaSquareMeters(square) - side * side) < 1);
  });

  it("폴리곤 둘레는 닫는 변까지 더한다", () => {
    const open = pathLengthMeters(triangle);
    const closed = pathLengthMeters(triangle, true);
    assert.ok(closed > open);
  });

  it("직선으로 펴면 양 끝점만 남긴다", () => {
    assert.deepEqual(straightenLine(triangle), [triangle[0], triangle[2]]);
    assert.deepEqual(straightenLine(triangle.slice(0, 2)), triangle.slice(0, 2));
  });
});
