import { expect, test, type Page, type Request } from "@playwright/test";

const festivalId = "00000000-0000-0000-0000-000000000030";
const staffName = "김스태프";

/** 타임존 표기 없이 UTC로 내려오는 서버 시각 문자열(`2026-09-09T05:06:37`). */
function serverNow(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "");
}

function apiBody(data: unknown) {
  return JSON.stringify({ code: 0, message: "OK", data });
}

interface MockOptions {
  /** 부스에 대기열이 붙어 있는지. 없으면 줄끝 갱신 버튼이 잠긴다. */
  withQueue?: boolean;
  congestionUpdatedAt?: string;
  /** 부스 1의 사전 대기 동선. 없으면 404를 내려 눈대중 존으로 떨어뜨린다. */
  queuePlan?: { path: Array<{ lat: number; lng: number }>; lengthMeters: number; revision: number };
}

/** 스태프 화면이 쓰는 API를 모두 가로채고, 지나간 요청을 기록해 돌려준다. */
async function mockStaffApis(page: Page, options: MockOptions = {}) {
  const { withQueue = true, congestionUpdatedAt = serverNow(), queuePlan } = options;
  const requests: Request[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(request);

    let data: unknown;
    if (path === "/api/field-staff/auth/me") {
      data = {
        staffId: "00000000-0000-0000-0000-000000000031",
        festivalId,
        loginId: "staff01",
        name: staffName,
      };
    } else if (path === "/api/field-staff/auth/logout") {
      data = null;
    } else if (path === `/api/festivals/${festivalId}/dashboard`) {
      data = {
        festivalId,
        festivalName: "테스트 축제",
        dataAvailable: true,
        operatingStatus: "OPERATING",
        currentVisitorCount: 120,
        activeQueueCount: 1,
        averageWaitMinutes: 7,
        updatedAt: congestionUpdatedAt,
        booths: [
          {
            boothId: 1,
            boothName: "떡볶이 부스",
            roadmapNodePublicId: "node-1",
            lat: 37.5663,
            lng: 126.978,
            congestionLevel: "HIGH",
            waitMinutes: 30,
            congestionUpdatedAt,
            modifierType: "STAFF",
            modifierName: staffName,
          },
          {
            boothId: 2,
            boothName: "솜사탕 부스",
            roadmapNodePublicId: "node-2",
            lat: 37.5665,
            lng: 126.9782,
            congestionLevel: "LOW",
            waitMinutes: 3,
          },
        ],
        zones: [
          { zoneId: "zone-1", name: "먹거리 구역", sortOrder: 1, boothNodeIds: ["node-1"] },
          { zoneId: "zone-2", name: "체험 구역", sortOrder: 2, boothNodeIds: ["node-2"] },
        ],
      };
    } else if (path.endsWith("/operations/queues")) {
      data = {
        festivalId,
        queues: withQueue
          ? [
              {
                queueId: "queue-1",
                boothId: 1,
                boothName: "떡볶이 부스",
                tailLatitude: 37.5664,
                tailLongitude: 126.9781,
                queueTailMeters: 15,
                path: null,
                lastModifierType: "STAFF",
                lastModifierName: staffName,
                updatedAt: congestionUpdatedAt,
              },
            ]
          : [],
      };
    } else if (path.endsWith("/queue-plan")) {
      if (queuePlan) {
        data = {
          planId: "plan-1",
          boothId: 1,
          path: queuePlan.path,
          lengthMeters: queuePlan.lengthMeters,
          metersPerPerson: 1,
          servedPersonsPerMinute: 2,
          estimatedCapacity: Math.round(queuePlan.lengthMeters),
          revision: queuePlan.revision,
          sourceNodeId: null,
          nodeVersion: 1,
          updatedAt: congestionUpdatedAt,
        };
      }
    } else if (path.endsWith("/operations/map")) {
      data = { mapId: "test-map", editRevision: 0, mapKind: "COORDINATE", booths: [] };
    } else if (path.endsWith("/congestion") && request.method() === "PUT") {
      data = null;
    } else if (path.includes("/operations/queues/") && request.method() === "PATCH") {
      data = { queueId: "queue-1", boothId: 1 };
    }

    await route.fulfill({
      status: data === undefined ? 404 : 200,
      contentType: "application/json",
      body:
        data === undefined
          ? JSON.stringify({ code: "NOT_FOUND", message: "없습니다.", data: null })
          : apiBody(data),
    });
  });

  return requests;
}

test("부스검색에서 고른 부스가 지도 화면 하단바에 반영된다", async ({ page }) => {
  await mockStaffApis(page);
  await page.goto("/staff/dashboard");
  await expect(page.getByText("테스트 축제", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "부스 검색" }).click();
  await expect(page).toHaveURL(/\/staff\/booths$/);
  await page.getByLabel("부스명 검색").fill("솜사탕");
  await page.getByRole("button", { name: /솜사탕 부스/ }).click();

  await expect(page).toHaveURL(/\/staff\/dashboard\?boothId=2$/);
  await expect(page.getByText("체험 구역 > 솜사탕 부스")).toBeVisible();
});

test("줄끝 갱신 시트는 자동 환산된 혼잡도와 존 선택을 보여준다", async ({ page }) => {
  const requests = await mockStaffApis(page);
  await page.goto(`/staff/dashboard?boothId=1`);

  await page.getByRole("button", { name: "줄끝 갱신" }).click();

  // 혼잡도·대기시간은 서버가 줄 끝 거리로 환산하므로 결과만 보여준다.
  await expect(page.getByRole("button", { name: "여유", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("예상 대기시간(분)")).toHaveCount(0);
  await expect(page.getByText("마지막 줄끝갱신자")).toBeVisible();

  // 존을 고르기 전에는 갱신할 수 없다.
  const zoneSelect = page.getByRole("combobox", { name: "줄끝 존 선택" });
  await expect(zoneSelect).toBeVisible();
  await expect(page.getByRole("button", { name: "줄끝 갱신하기" })).toBeDisabled();
  await zoneSelect.click();
  await page.getByRole("option", { name: "존 2 · 20m" }).click();
  await expect(page.getByRole("button", { name: "줄끝 갱신하기" })).toBeEnabled();

  // 혼잡도는 서버가 계산하므로 프런트가 직접 보내지 않는다.
  expect(requests.filter((request) => request.method() === "PUT")).toEqual([]);
});

test("사전 동선이 있으면 존을 줄 길이만큼만 주고 동선 위 지점을 보낸다", async ({ page }) => {
  // 부스에서 북쪽으로 30m 뻗은 줄. 존은 10·20·30m 세 칸이어야 한다.
  const requests = await mockStaffApis(page, {
    queuePlan: {
      path: [
        { lat: 37.5663, lng: 126.978 },
        { lat: 37.5663 + 30 / 111_320, lng: 126.978 },
      ],
      lengthMeters: 30,
      revision: 4,
    },
  });
  await page.goto(`/staff/dashboard?boothId=1`);
  await page.getByRole("button", { name: "줄끝 갱신" }).click();
  await expect(page.getByText("미리 그린 줄을 10m씩 나눈 존입니다.")).toBeVisible();

  const zoneSelect = page.getByRole("combobox", { name: "줄끝 존 선택" });
  await zoneSelect.click();
  // 30m짜리 줄에 존 4(40m)까지 열어 두면 설 수 없는 길이가 보고된다.
  await expect(page.getByRole("option", { name: "존 4 · 40m" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "존 3 · 30m" })).toBeVisible();
  await page.getByRole("option", { name: "존 2 · 20m" }).click();
  await page.getByRole("button", { name: "줄끝 갱신하기" }).click();

  const patch = requests.find(
    (request) => request.method() === "PATCH" && request.url().includes("/operations/queues/"),
  );
  const body = patch?.postDataJSON();
  /*
    경로와 보고 거리를 빼야 서버가 사전 동선에 투영해 실제 줄 길이를 잰다. 둘 중 하나라도
    실려 있으면 직선거리나 눈대중 거리로 계산이 새 버린다.
  */
  expect(body).toMatchObject({ planRevision: 4 });
  expect(body).not.toHaveProperty("path");
  expect(body).not.toHaveProperty("queueTailMeters");
  // 동선을 20m 따라간 지점이라 부스보다 북쪽이고 줄 끝(30m)보다는 남쪽이다.
  expect(body.tailLatitude).toBeGreaterThan(37.5663);
  expect(body.tailLatitude).toBeLessThan(37.5663 + 30 / 111_320);
  expect(body.tailLongitude).toBeCloseTo(126.978, 6);
});

/*
  서버는 타임존 표기 없이 UTC로 시각을 내려준다. 브라우저 타임존이 UTC면 어긋남이
  드러나지 않으므로, 이 회귀 테스트만 한국 시간대로 고정한다.
*/
test.describe("갱신 시각 표기", () => {
  test.use({ timezoneId: "Asia/Seoul" });

  test("타임존 표기가 없는 UTC 시각을 방금 전으로 읽는다", async ({ page }) => {
    await mockStaffApis(page);
    await page.goto(`/staff/dashboard?boothId=1`);
    await page.getByRole("button", { name: "줄끝 갱신" }).click();

    await expect(page.getByText("방금 전")).toBeVisible();
    await expect(page.getByText("9시간 전")).toHaveCount(0);
  });
});

test("구역을 고르면 지도와 요약이 그 구역 기준으로 바뀐다", async ({ page }) => {
  await mockStaffApis(page);
  await page.goto("/staff/dashboard");

  // 기본값은 «전체»다. 축제 전체에서 가장 혼잡한 부스는 떡볶이 부스(HIGH)다.
  const zoneSelect = page.getByRole("combobox", { name: "구역 선택" });
  await expect(zoneSelect).toHaveText("전체");
  await expect(page.getByText("떡볶이 부스")).toBeVisible();

  await zoneSelect.click();
  await page.getByRole("option", { name: "체험 구역" }).click();

  // 고른 구역은 URL에 남아 새로고침해도 유지된다.
  await expect(page).toHaveURL(/[?&]zoneId=zone-2/);
  await expect(page.getByText("테스트 축제 · 체험 구역")).toBeVisible();
  // 요약이 그 구역 부스만으로 다시 계산된다(떡볶이 부스는 먹거리 구역이라 빠진다).
  await expect(page.getByText("떡볶이 부스")).toHaveCount(0);
  await expect(page.getByText("솜사탕 부스")).toBeVisible();
});

test("지도 확대 버튼은 최대 확대 상태에서 비활성화된다", async ({ page }) => {
  await mockStaffApis(page);
  await page.goto("/staff/dashboard");

  const zoomIn = page.getByRole("button", { name: "지도 확대" });
  const zoomOut = page.getByRole("button", { name: "지도 축소" });

  await expect(zoomIn).toBeDisabled();
  await expect(zoomOut).toBeEnabled();

  // 한 번만 축소해도 곧바로 확대할 수 있어야 한다(헛클릭이 쌓이지 않는다).
  await zoomOut.click();
  await expect(zoomIn).toBeEnabled();
});
