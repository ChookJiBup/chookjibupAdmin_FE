import { expect, test, type Page } from "@playwright/test";

/*
  하루가 끝난 일차의 방문 인원이 비어 있으면 콘솔에 들어오자마자 채우게 하는 게이트.

  화면을 막는 장치라 잘못 뜨면 콘솔 자체를 못 쓰게 된다. 반대로 안 뜨면 그날 인원을
  나중에 기억으로 적게 된다. 양쪽을 모두 고정한다.
*/

const completedId = "00000000-0000-0000-0000-0000000000c1";
const ongoingId = "00000000-0000-0000-0000-0000000000c2";
const operatorId = "00000000-0000-0000-0000-0000000000c3";
const upcomingId = "00000000-0000-0000-0000-0000000000c4";

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

/** n일 전을 "yyyy-MM-dd"로. 음수면 n일 뒤다. */
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
  /**
   * 하루가 끝난 일차의 방문 인원. null이면 아직 비어 있는 날이다.
   * 마지막 칸이 «어제»이고 앞으로 갈수록 하루씩 이전이다.
   */
  counts: (number | null)[];
  /** 아직 마감되지 않은 일차 수(오늘·이후). 응답에는 오지만 inputAllowed가 false다. */
  openDays?: number;
  mode?: "DAILY" | "TOTAL" | "UNSET";
}

/** 하루가 끝난 i번째(0-based) 일차의 날짜. */
function elapsedDate(options: VisitorOptions, index: number) {
  return isoDaysAgo(options.counts.length - index);
}

async function mockConsole(
  page: Page,
  visitorsByFestival: Record<string, VisitorOptions>,
  festivals: ReturnType<typeof festival>[],
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
      const visitorCount = (request.postDataJSON() as { visitorCount: number }).visitorCount;
      saved.push({ festivalId: dailyPut[1], visitDate: dailyPut[2], visitorCount });
      // 저장한 날은 더 이상 비어 있지 않다.
      const target = visitorsByFestival[dailyPut[1]];
      if (target) {
        const index = target.counts.findIndex(
          (_, position) => elapsedDate(target, position) === dailyPut[2],
        );
        if (index >= 0) target.counts[index] = visitorCount;
      }
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
        const days = options.counts.map((visitorCount, index) => ({
          visitDate: elapsedDate(options, index),
          dayIndex: index + 1,
          visitorCount,
          inputAllowed: true,
          saved: visitorCount !== null,
        }));
        // 오늘·이후 일차는 백엔드가 아직 입력을 받지 않는다(inputAllowed=false).
        for (let offset = 0; offset < (options.openDays ?? 0); offset += 1) {
          days.push({
            visitDate: isoDaysAgo(-offset),
            dayIndex: days.length + 1,
            visitorCount: null,
            inputAllowed: false,
            saved: false,
          });
        }
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

const ongoingFestival = festival(
  ongoingId,
  "진행중 축제",
  "ONGOING",
  "FESTIVAL_OWNER",
  isoDaysAgo(2),
  isoDaysAgo(-2),
);
const completedFestival = festival(
  completedId,
  "끝난 축제",
  "COMPLETED",
  "FESTIVAL_OWNER",
  isoDaysAgo(3),
  isoDaysAgo(1),
);

test("진행중 축제도 하루가 끝나면 묻고, 지나간 일차가 누적돼 보인다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // 1일차는 어제 입력을 마쳤고, 2일차가 어제 끝나 오늘 비어 있는 상황이다.
  const saved = await mockConsole(
    page,
    { [ongoingId]: { counts: [2123, null], openDays: 2, mode: "UNSET" } },
    [ongoingFestival],
  );
  await page.goto("/console");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("축제 방문 인원")).toBeVisible();
  // 이미 입력된 날이 있으므로 말풍선은 «확인해 달라»는 쪽이다.
  await expect(dialog.getByText("입력된 방문인원이 맞는지 확인해 주세요")).toBeVisible();

  // 라벨에는 날짜를 붙이지 않고 일차만 쓴다.
  await expect(dialog.getByLabel("1일차")).toHaveValue("2,123");
  await expect(dialog.getByLabel("2일차")).toHaveValue("");
  // 아직 마감되지 않은 오늘·내일 일차는 목록에 없다.
  await expect(dialog.getByLabel("3일차")).toHaveCount(0);

  // 총합은 채워진 값만으로도 계산된다.
  const total = dialog.getByLabel("총합");
  await expect(total).toBeDisabled();
  await expect(total).toHaveValue("2,123");

  const submit = dialog.getByRole("button", { name: "입력하기", exact: true });
  await expect(submit).toBeDisabled();
  await dialog.getByLabel("2일차").fill("2432");
  await expect(total).toHaveValue("4,555");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(dialog).toBeHidden();
  // 값이 그대로인 1일차는 다시 보내지 않는다.
  expect(saved).toEqual([{ festivalId: ongoingId, visitDate: isoDaysAgo(1), visitorCount: 2432 }]);
});

test("한 날도 입력되지 않았으면 입력을 권하는 말풍선이 뜬다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockConsole(page, { [completedId]: { counts: [null, null, null] } }, [completedFestival]);
  await page.goto("/console");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // 어느 축제 이야기인지 밝힌다 — 축제를 고르기 전 화면이라 이름이 없으면 알 수 없다.
  await expect(dialog.getByText("끝난 축제")).toBeVisible();
  await expect(dialog.getByText("방문인원을 입력하면 축제성과를 분석할 수 있어요.")).toBeVisible();
  await expect(dialog.getByLabel("총합")).toHaveValue("");
  await expect(dialog.getByLabel("3일차")).toBeVisible();
});

test("다 채우기 전에는 닫을 수 없고, 채우면 바뀐 날만 저장하고 사라진다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const saved = await mockConsole(page, { [completedId]: { counts: [null, null, 3000] } }, [
    completedFestival,
  ]);
  await page.goto("/console");

  const dialog = page.getByRole("dialog");
  const submit = dialog.getByRole("button", { name: "입력하기", exact: true });
  await expect(submit).toBeDisabled();

  // 닫기(X)는 없고, 딤 클릭과 Esc로도 빠져나갈 수 없다.
  await expect(dialog.getByRole("button", { name: "닫기" })).toHaveCount(0);
  await page.mouse.click(10, 500);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  // 한 칸만 채워도 아직 못 넘어간다.
  await dialog.getByLabel("1일차").fill("1200");
  await expect(submit).toBeDisabled();

  await dialog.getByLabel("2일차").fill("3400");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(dialog).toBeHidden();
  // 이미 저장돼 있던 3일차는 손대지 않았으므로 요청이 나가지 않는다.
  expect(saved.map((entry) => entry.visitorCount).sort((a, b) => a - b)).toEqual([1200, 3400]);
  expect(saved.every((entry) => entry.festivalId === completedId)).toBe(true);
});

test("시작 전 축제나 운영자 권한만 있는 축제로는 막지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockConsole(
    page,
    {
      // 아직 시작하지 않았으니 끝난 일차가 없다.
      [upcomingId]: { counts: [], openDays: 3 },
      // 끝났지만 운영자(제2관리자)라 입력 주체가 아니다.
      [operatorId]: { counts: [null, null, null] },
    },
    [
      festival(
        upcomingId,
        "예정 축제",
        "UPCOMING",
        "FESTIVAL_OWNER",
        isoDaysAgo(-1),
        isoDaysAgo(-3),
      ),
      festival(operatorId, "남의 축제", "COMPLETED", "SUB_ADMIN", isoDaysAgo(5), isoDaysAgo(2)),
    ],
  );
  await page.goto("/console");

  // 목록이 그려졌는데도 모달이 없다 — 판정이 «끝난 일차 + 총괄»에만 걸린다는 뜻이다.
  await expect(page.getByText("남의 축제")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("집계 방식이 총합인 축제는 일자별로 묻지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockConsole(page, { [completedId]: { counts: [null, null, null], mode: "TOTAL" } }, [
    completedFestival,
  ]);
  await page.goto("/console");

  await expect(page.getByText("끝난 축제")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
