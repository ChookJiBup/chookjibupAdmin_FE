import { expect, test, type Page } from "@playwright/test";

const festivalId = "00000000-0000-0000-0000-000000000021";
const mapId = "00000000-0000-0000-0000-0000000000a1";
const boothmapPath = `/console/festivals/${festivalId}/boothmap`;
const center = { lat: 35.1495, lng: 126.9195 };

async function mockBoothMap(page: Page) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    let code = 0;
    if (path === "/api/admin/me") {
      data = {
        adminId: "00000000-0000-0000-0000-000000000001",
        email: "boothmap-help@example.com",
        name: "테스트 관리자",
        organization: "테스트 운영팀",
        rank: null,
        accountKind: "GOVERNMENT",
        status: "ACTIVE",
      };
    } else if (path === `/api/admin/me/managed-festivals/${festivalId}`) {
      data = {
        festivalId,
        festivalName: "테스트 축제",
        role: "FESTIVAL_OWNER",
        festivalStatus: "DRAFT",
        locations: [{ primary: true, latitude: center.lat, longitude: center.lng }],
      };
    } else if (path === `/api/festivals/${festivalId}/maps/current`) {
      data = { mapId, mapName: "테스트 배치", editRevision: 1, roadmapStatus: "EDITING", center };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/editor`) {
      data = {
        mapId,
        editRevision: 1,
        roadmapStatus: "EDITING",
        center,
        nodes: [
          {
            nodeId: "node-1",
            nodeType: "BOOTH",
            name: "떡볶이존",
            geometryType: "POINT",
            geometry: center,
            confidence: null,
            recognizedText: null,
            source: "MANUAL",
            reviewStatus: "OK",
            sortOrder: 0,
            geometrySchemaVersion: "2.0",
          },
        ],
        zones: [],
      };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/analysis`) {
      // 좌표 전용 지도라 분석 작업이 없다. 이 화면의 정상 상태다.
      code = 40406;
    }
    await route.fulfill({
      status: data === undefined ? 404 : 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: data === undefined ? code || 40400 : 0,
        message: data === undefined ? "NOT_FOUND" : "OK",
        data: data ?? null,
      }),
    });
  });
}

test("도움말은 도구 이름과 하는 일을 함께 보여 준다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockBoothMap(page);
  await page.goto(boothmapPath);

  const help = page.getByRole("button", { name: "도움말", exact: true });
  await expect(help).toBeVisible();
  await help.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("부스 편집 도움말")).toBeVisible();

  /*
    아이콘만 보고는 알 수 없던 도구들이라, 이름과 설명이 함께 있어야 도움말 구실을 한다.
  */
  await expect(dialog.getByText("범위 선택", { exact: true })).toBeVisible();
  await expect(dialog.getByText("지도를 끌어 안에 든 것을 한 번에 고릅니다.")).toBeVisible();
  await expect(dialog.getByText("부지 경계", { exact: true })).toBeVisible();

  // 이름이 닮아 가장 많이 헷갈리는 둘을 갈라 준다.
  await expect(dialog.getByText("는 부스를 나란히 정렬하는 것이고")).toBeVisible();

  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
