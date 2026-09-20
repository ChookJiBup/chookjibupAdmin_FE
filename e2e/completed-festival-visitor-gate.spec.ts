import { expect, test, type Page } from "@playwright/test";

/*
  끝난 축제의 방문 인원이 비어 있으면 콘솔에 들어오자마자 채우게 하는 게이트.

  화면을 막는 장치라 잘못 뜨면 콘솔 자체를 못 쓰게 된다. 반대로 안 뜨면 축제가 끝난
  줄 모르고 지나가 결과리포트의 근거가 비어 버린다. 양쪽을 모두 고정한다.
*/

const completedId = "00000000-0000-0000-0000-0000000000c1";
const ongoingId = "00000000-0000-0000-0000-0000000000c2";
const operatorId = "00000000-0000-0000-0000-0000000000c3";

function festival(
  festivalId: string,
  festivalName: string,
  progressStatus: "UPCOMING" | "ONGOING" | "COMPLETED",
  role: "FESTIVAL_OWNER" | "SUB_ADMIN",
  startDate: string,
  endDate: string,
) {
  return {
    festivalId,
    festivalName,
    festivalYear: 2026,
    role,
    festivalStatus: "PUBLISHED",
    progressStatus,
    address: "광주광역시 동구",
    detailAddress: "금남로 일대",
    startDate,
    endDate,
  };
}

/** 어제를 "yyyy-MM-dd"로. 오늘은 아직 안 끝난 날이라 누락으로 치지 않는다. */
function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0"),
  ].join("-");
}

interface VisitorOptions {
  /** 비어 있는 채로 둘 날 수. 0이면 전부 채워진 것으로 본다. */
  missing: number;
  mode?: "DAILY" | "TOTAL" | "UNSET";
}

async function mockConsole(
  page: Page,
  visitorsByFestival: Record<string, VisitorOptions>,
  festivals = [
    festival(completedId, "끝난 축제", "COMPLETED", "FESTIVAL_OWNER", isoDaysAgo(3), isoDaysAgo(1)),
    festival(ongoingId, "진행중 축제", "ONGOING", "FESTIVAL_OWNER", isoDaysAgo(1), isoDaysAgo(-3)),
  ],
) {
  const saved: { festivalId: string; visitDate: string; visitorCount: number }[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    const dailyPut = path.match(
      /\/api\/festivals\/([^/]+)\/operations\/visitors\/daily\/([\d-]+)$/,
    );
    if (request.method() === "PUT" && dailyPut) {
      saved.push({
        festivalId: dailyPut[1],
        visitDate: dailyPut[2],
        visitorCount: (request.postDataJSON() as { visitorCount: number }).visitorCount,
      });
      // 저장한 날은 더 이상 비어 있지 않다.
      const target = visitorsByFestival[dailyPut[1]];
      if (target) target.missing = Math.max(0, target.missing - 1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 0, message: "OK", data: null }),
      });
      return;
    }

    let data: unknown;
    if (path === "/api/admin/me") {
      data = {
        adminId: "00000000-0000-0000-0000-000000000001",
        email: "gate@example.com",
        name: "테스트 관리자",
        organization: "테스트 운영팀",
        rank: null,
        accountKind: "GOVERNMENT",
        status: "ACTIVE",
      };
    } else if (path === "/api/admin/me/managed-festivals") {
      data = festivals;
    } else {
      const visitors = path.match(/\/api\/festivals\/([^/]+)\/operations\/visitors$/);
      if (visitors) {
        const options = visitorsByFestival[visitors[1]];
        if (!options) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            body: JSON.stringify({ code: 40400, message: "NOT_FOUND", data: null }),
          });
          return;
        }
        // 3일치 중 앞에서부터 options.missing개만 비워 둔다.
        const days = [3, 2, 1].map((ago, index) => ({
          visitDate: isoDaysAgo(ago),
          dayIndex: index + 1,
          visitorCount: index < options.missing ? null : 1000 * (index + 1),
          inputAllowed: true,
          saved: index >= options.missing,
        }));
        data = { visitorCountInputMode: options.mode ?? "DAILY", days, totalVisitorCount: null };
      }
    }

    await route.fulfill({
      status: data === undefined ? 404 : 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: data === undefined ? 40400 : 0,
        message: data === undefined ? "NOT_FOUND" : "OK",
        data: data ?? null,
      }),
    });
  });
  return saved;
}

test("끝난 축제에 빠진 날이 있으면 콘솔에 들어오자마자 묻는다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockConsole(page, {
    [completedId]: { missing: 2 },
    [ongoingId]: { missing: 0 },
  });
  await page.goto("/console");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // 어느 축제 이야기인지 밝힌다 — 축제를 고르기 전 화면이라 이름이 없으면 알 수 없다.
  await expect(dialog.getByText("«끝난 축제» 축제가 끝났습니다")).toBeVisible();
  await expect(dialog.getByRole("textbox")).toHaveCount(2);
});

test("다 채우기 전에는 닫을 수 없고, 채우면 저장하고 사라진다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const saved = await mockConsole(page, {
    [completedId]: { missing: 2 },
    [ongoingId]: { missing: 0 },
  });
  await page.goto("/console");

  const dialog = page.getByRole("dialog");
  const submit = dialog.getByRole("button", { name: "입력하기", exact: true });
  await expect(submit).toBeDisabled();

  // 딤 클릭과 Esc로는 빠져나갈 수 없다.
  await page.mouse.click(10, 500);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  // 한 칸만 채워도 아직 못 넘어간다.
  const boxes = dialog.getByRole("textbox");
  await boxes.nth(0).fill("1200");
  await expect(submit).toBeDisabled();

  await boxes.nth(1).fill("3400");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(dialog).toBeHidden();
  expect(saved.map((entry) => entry.visitorCount).sort((a, b) => a - b)).toEqual([1200, 3400]);
  expect(saved.every((entry) => entry.festivalId === completedId)).toBe(true);
});

test("진행중 축제나 운영자 권한만 있는 축제로는 막지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockConsole(
    page,
    {
      // 진행중인데 지난 날이 비어 있어도 «끝난 축제»가 아니므로 이 게이트는 걸지 않는다.
      [ongoingId]: { missing: 2 },
      // 끝났지만 운영자(제2관리자)라 입력 주체가 아니다.
      [operatorId]: { missing: 2 },
    },
    [
      festival(
        ongoingId,
        "진행중 축제",
        "ONGOING",
        "FESTIVAL_OWNER",
        isoDaysAgo(2),
        isoDaysAgo(-2),
      ),
      festival(operatorId, "남의 축제", "COMPLETED", "SUB_ADMIN", isoDaysAgo(5), isoDaysAgo(2)),
    ],
  );
  await page.goto("/console");

  // 목록이 그려졌는데도 모달이 없다 — 판정이 «끝난 축제 + 총괄»에만 걸린다는 뜻이다.
  await expect(page.getByText("남의 축제")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("집계 방식이 총합인 축제는 일자별로 묻지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockConsole(page, {
    [completedId]: { missing: 3, mode: "TOTAL" },
    [ongoingId]: { missing: 0 },
  });
  await page.goto("/console");

  await expect(page.getByText("끝난 축제")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
