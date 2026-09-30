import { expect, test } from "@playwright/test";

const festivalId = "00000000-0000-0000-0000-000000000050";
const mapId = "00000000-0000-0000-0000-0000000000e0";

test("신규 축제는 지도 미등록 404 뒤 좌표 지도를 한 번 만들고 빈 편집기를 연다", async ({
  page,
}) => {
  const requests: string[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(`${request.method()} ${path}`);

    let status = 200;
    let code = 0;
    let data: unknown = {};

    if (path === "/api/admin/me") {
      data = {
        adminId: "00000000-0000-0000-0000-000000000001",
        email: "map-init@example.com",
        name: "테스트 관리자",
        organization: "테스트 운영팀",
        accountKind: "GOVERNMENT",
        status: "ACTIVE",
      };
    } else if (path === `/api/admin/me/managed-festivals/${festivalId}`) {
      data = {
        festivalId,
        festivalName: "신규 축제",
        role: "FESTIVAL_OWNER",
        festivalStatus: "DRAFT",
        progressStatus: "UPCOMING",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
        locations: [{ primary: true, latitude: 37.5665, longitude: 126.978 }],
      };
    } else if (request.method() === "GET" && path.endsWith("/maps/current")) {
      status = 404;
      code = 40405;
      data = null;
    } else if (request.method() === "POST" && path === `/api/festivals/${festivalId}/maps`) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      data = {
        mapId,
        mapName: "본행사 배치",
        editRevision: 0,
        roadmapStatus: "EDITING",
        center: { lat: 37.5665, lng: 126.978 },
      };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/editor`) {
      data = {
        mapId,
        editRevision: 0,
        roadmapStatus: "EDITING",
        center: { lat: 37.5665, lng: 126.978 },
        nodes: [],
        zones: [],
        presentation: null,
      };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/analysis`) {
      status = 404;
      code = 40406;
      data = null;
    } else if (path.endsWith("/dashboard")) {
      data = { booths: [], zones: [] };
    } else if (path.endsWith("/queues")) {
      data = { queues: [] };
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ code, message: status === 200 ? "OK" : "NOT_FOUND", data }),
    });
  });

  await page.goto(`/console/festivals/${festivalId}/boothmap`);
  await expect(page.getByRole("button", { name: "AI 분석" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "문제가 발생했습니다" })).toHaveCount(0);

  expect(requests.filter((request) => request.endsWith("/maps/current"))).toHaveLength(1);
  expect(
    requests.filter((request) => request === `POST /api/festivals/${festivalId}/maps`),
  ).toHaveLength(1);
  expect(requests).toContain(`GET /api/festivals/${festivalId}/maps/${mapId}/editor`);
});
