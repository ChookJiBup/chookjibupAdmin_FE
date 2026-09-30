import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AxiosError, AxiosHeaders } from "axios";
import { ensureCoordinateMap } from "./api";
import type { CreateCoordinateMapResponse } from "./types";

const map: CreateCoordinateMapResponse = {
  mapId: "map-1",
  mapName: "본행사 배치",
  editRevision: 0,
  roadmapStatus: "EDITING",
  center: { lat: 37.5665, lng: 126.978 },
};

function httpError(status: number) {
  return new AxiosError("request failed", undefined, undefined, undefined, {
    status,
    statusText: "error",
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: null,
  });
}

describe("ensureCoordinateMap", () => {
  it("current map 404는 오류로 끝내지 않고 생성 결과를 반환한다", async () => {
    let createCount = 0;
    const result = await ensureCoordinateMap("festival-new", "본행사 배치", {
      getCurrent: async () => Promise.reject(httpError(404)),
      create: async (_festivalId, request) => {
        createCount += 1;
        assert.deepEqual(request, { mapName: "본행사 배치" });
        return map;
      },
    });

    assert.deepEqual(result, map);
    assert.equal(createCount, 1);
  });

  it("동시에 초기화해도 지도 생성 요청은 한 번만 보낸다", async () => {
    let createCount = 0;
    const dependencies = {
      getCurrent: async () => Promise.reject(httpError(404)),
      create: async () => {
        createCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return map;
      },
    };

    const [first, second] = await Promise.all([
      ensureCoordinateMap("festival-concurrent", "본행사 배치", dependencies),
      ensureCoordinateMap("festival-concurrent", "본행사 배치", dependencies),
    ]);

    assert.deepEqual(first, map);
    assert.deepEqual(second, map);
    assert.equal(createCount, 1);
  });

  it("404가 아닌 실제 조회 오류는 그대로 전달한다", async () => {
    const error = httpError(500);
    await assert.rejects(
      ensureCoordinateMap("festival-error", "본행사 배치", {
        getCurrent: async () => Promise.reject(error),
        create: async () => map,
      }),
      (caught) => caught === error,
    );
  });
});
