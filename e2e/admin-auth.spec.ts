import { expect, test, type Page } from "@playwright/test";

const admin = {
  adminId: "00000000-0000-0000-0000-000000000001",
  festivalId: null,
  email: "admin@example.com",
  name: "테스트 관리자",
  organization: "축제 운영팀",
  rank: "담당자",
  accountKind: "GOVERNMENT",
  role: null,
  canInviteSubAdmin: true,
  canModifyFestivalInfo: true,
  canViewOperationReport: true,
  canUpdateQueueTail: true,
} as const;

function apiResponse(data: unknown) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ code: 0, message: "OK", data }),
  };
}

async function mockAdminApis(page: Page) {
  await page.route("**/api/admin/auth/login", async (route) => {
    await route.fulfill(apiResponse({ expiresIn: 3600, admin }));
  });
  await page.route("**/api/admin/me", async (route) => {
    await route.fulfill(
      apiResponse({
        adminId: admin.adminId,
        email: admin.email,
        name: admin.name,
        organization: admin.organization,
        rank: admin.rank,
        accountKind: admin.accountKind,
        status: "ACTIVE",
      }),
    );
  });
  await page.route("**/api/admin/me/managed-festivals", async (route) => {
    await route.fulfill(apiResponse([]));
  });
}

test("관리자 로그인 화면을 표시한다", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByLabel("이메일")).toBeVisible();
  await expect(page.getByLabel("비밀번호")).toBeVisible();
  await expect(page.getByRole("button", { name: "로그인" })).toBeVisible();
});

test("로그인 후 보호된 관리자 화면으로 이동한다", async ({ page }) => {
  await mockAdminApis(page);
  await page.goto("/login");

  await page.getByLabel("이메일").fill(admin.email);
  await page.getByLabel("비밀번호").fill("test-password");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByText("등록된 축제가 없습니다")).toBeVisible();

  await page.goto("/console/mypage");
  await expect(page.getByText("프로필 설정")).toBeVisible();
  await expect(page.locator(`input[value="${admin.email}"]`)).toBeVisible();
});
