import { expect, test, type Page } from "@playwright/test";

const festivalId = "00000000-0000-0000-0000-000000000030";
const detailPath = `/console/festivals/${festivalId}`;

async function mockFestival(page: Page, role = "FESTIVAL_OWNER", fail = false) {
  const requests: unknown[] = [];
  let progressStatus = "COMPLETED";
  let progressStatusOverride: string | null = "COMPLETED";
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown;
    if (path.endsWith("/progress-status") && request.method() === "PATCH") {
      const body = request.postDataJSON();
      requests.push(body);
      if (fail) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ code: 40300, message: "권한이 없습니다.", data: null }),
        });
        return;
      }
      progressStatusOverride = body.automatic ? null : body.progressStatus;
      progressStatus = progressStatusOverride ?? "UPCOMING";
      data = null;
    } else if (path === "/api/admin/me") {
      data = {
        adminId: "admin",
        email: "test@mapo.go.kr",
        name: "관리자",
        accountKind: "GOVERNMENT",
        status: "ACTIVE",
      };
    } else if (path === `/api/admin/me/managed-festivals/${festivalId}`) {
      data = {
        festivalId,
        festivalName: "상태 변경 축제",
        description: "검증 축제",
        festivalYear: 2099,
        role,
        festivalStatus: "DRAFT",
        progressStatus,
        progressStatusOverride,
        startDate: "2099-10-01",
        endDate: "2099-10-03",
        locations: [],
        visitorCountInputMode: "UNSET",
      };
    } else if (path === "/api/admin/me/managed-festivals") {
      data = [];
    }
    await route.fulfill({
      status: data === undefined ? 404 : 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "OK", data: data ?? null }),
    });
  });
  return requests;
}

test("종료된 축제도 수동 진행으로 바꾸고 자동 모드로 복귀할 수 있다", async ({ page }) => {
  const requests = await mockFestival(page);
  await page.goto(detailPath);
  await expect(page.getByText("진행 상태: 종료", { exact: true })).toBeVisible();
  await page.getByLabel("진행 상태 변경", { exact: true }).selectOption("ONGOING");
  await page.getByRole("button", { name: "상태 변경", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "변경", exact: true }).click();
  await expect(page.getByText("진행 상태: 진행 중", { exact: true })).toBeVisible();
  await page.getByLabel("진행 상태 변경", { exact: true }).selectOption("AUTO");
  await page.getByRole("button", { name: "상태 변경", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "변경", exact: true }).click();
  await expect(page.getByText("진행 상태: 진행 예정", { exact: true })).toBeVisible();
  expect(requests).toEqual([{ automatic: false, progressStatus: "ONGOING" }, { automatic: true }]);
});

test("취소하거나 저장이 실패하면 기존 진행 상태를 유지한다", async ({ page }) => {
  const requests = await mockFestival(page, "FESTIVAL_OWNER", true);
  await page.goto(detailPath);
  await page.getByLabel("진행 상태 변경", { exact: true }).selectOption("ONGOING");
  await page.getByRole("button", { name: "상태 변경", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "취소", exact: true }).click();
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "상태 변경", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "변경", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("권한이 없습니다.")).toBeVisible();
  await expect(page.getByText("진행 상태: 종료", { exact: true })).toBeVisible();
});

test("운영자에게 상태 변경 버튼을 노출하지 않는다", async ({ page }) => {
  await mockFestival(page, "SUB_ADMIN");
  await page.goto(detailPath);
  await expect(page).toHaveURL(`${detailPath}/dashboard`);
  await expect(page.getByRole("button", { name: "상태 변경", exact: true })).toHaveCount(0);
});
