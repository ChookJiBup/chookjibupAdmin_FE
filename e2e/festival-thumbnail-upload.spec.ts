import { expect, test } from "@playwright/test";

test("최소 해상도보다 작은 이미지도 축제 대표 썸네일로 선택한다", async ({ page }) => {
  await page.route("**/api/admin/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "OK",
        data: {
          adminId: "00000000-0000-0000-0000-000000000001",
          email: "owner@example.com",
          name: "테스트 관리자",
          organization: "테스트 운영팀",
          rank: null,
          accountKind: "GOVERNMENT",
          status: "ACTIVE",
        },
      }),
    });
  });
  await page.goto("/console/festivals/new");

  await page.locator('input[type="file"]').setInputFiles({
    name: "small-thumbnail.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });

  await expect(page.getByText("small-thumbnail.png", { exact: true })).toBeVisible();
  await expect(page.getByText("최소 해상도 제한이 없습니다.", { exact: false })).toBeVisible();
  await expect(page.getByText(/이미지만 첨부할 수 있습니다|50MB까지/)).toHaveCount(0);
});
