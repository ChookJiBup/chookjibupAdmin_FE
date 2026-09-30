import { expect, test, type Page } from "@playwright/test";

/*
  방문 인원 모달은 콘솔 메인의 전역 게이트가 아니다. 총괄관리자와 운영자가
  특정 진행 중 축제를 선택해 festival-scoped 화면에 진입했을 때만, 그 festivalId의
  오늘까지 미입력 일차를 즉시 묻는다.
*/

const festivalId = "00000000-0000-0000-0000-0000000000c1";

type Role = "FESTIVAL_OWNER" | "SUB_ADMIN";
type ProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

function isoDate(offsetFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetFromToday);
  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0"),
  ].join("-");
}

function festival(role: Role, progressStatus: ProgressStatus) {
  return {
    festivalId,
    festivalName: `${role === "FESTIVAL_OWNER" ? "총괄" : "운영"} 담당 축제`,
    festivalYear: 2026,
    role,
    festivalStatus: "PUBLISHED",
    progressStatus,
    address: "광주광역시 동구",
    detailAddress: "금남로 일대",
    description: "테스트 축제",
    startDate: isoDate(-1),
    endDate: isoDate(2),
    visitorCountInputMode: "DAILY",
    locations: [],
  };
}

interface MockOptions {
  role: Role;
  progressStatus?: ProgressStatus;
  counts?: (number | null)[];
}

async function mockConsole(page: Page, options: MockOptions) {
  const selectedFestival = festival(options.role, options.progressStatus ?? "ONGOING");
  const counts = options.counts ?? [1200, null];
  const visitorRequests: string[] = [];
  const saved: { visitDate: string; visitorCount: number }[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown;

    const dailyPut = path.match(/\/api\/festivals\/[^/]+\/operations\/visitors\/daily\/([\d-]+)$/);
    if (request.method() === "PUT" && dailyPut) {
      const visitorCount = (request.postDataJSON() as { visitorCount: number }).visitorCount;
      const dayIndex = dailyPut[1] === isoDate(-1) ? 0 : 1;
      counts[dayIndex] = visitorCount;
      saved.push({ visitDate: dailyPut[1], visitorCount });
      data = null;
    } else if (path === "/api/admin/me") {
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
      data = [selectedFestival];
    } else if (path === `/api/admin/me/managed-festivals/${festivalId}`) {
      data = selectedFestival;
    } else if (path === `/api/festivals/${festivalId}/operations/visitors`) {
      visitorRequests.push(path);
      data = {
        festivalId,
        startDate: isoDate(-1),
        endDate: isoDate(2),
        visitorCountInputMode: "DAILY",
        days: [
          {
            visitDate: isoDate(-1),
            dayIndex: 1,
            visitorCount: counts[0],
            inputAllowed: true,
            saved: counts[0] !== null,
          },
          {
            visitDate: isoDate(0),
            dayIndex: 2,
            visitorCount: counts[1],
            inputAllowed: true,
            saved: counts[1] !== null,
          },
          {
            visitDate: isoDate(1),
            dayIndex: 3,
            visitorCount: null,
            inputAllowed: false,
            saved: false,
          },
        ],
        filledDayCount: counts.filter((count) => count !== null).length,
        totalDayCount: 4,
        allDaysFilled: false,
        sumVisitorCount: counts.reduce<number>((sum, count) => sum + (count ?? 0), 0),
        totalOverrideVisitorCount: null,
        totalSaved: false,
        effectiveVisitorCount: null,
        effectiveSource: "DAILY_SUM",
        effectiveStatus: "PARTIAL",
        difference: null,
        reportReadyToGenerate: false,
      };
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

  return { selectedFestival, visitorRequests, saved };
}

for (const role of ["FESTIVAL_OWNER", "SUB_ADMIN"] as const) {
  test(`${role} 메인에서는 미입력이 있어도 모달을 띄우지 않는다`, async ({ page }) => {
    const { selectedFestival, visitorRequests } = await mockConsole(page, { role });

    await page.goto("/console");

    await expect(
      page.getByRole("link", { name: new RegExp(selectedFestival.festivalName) }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(visitorRequests).toEqual([]);
  });

  test(`${role} 진행 중 축제를 선택하면 오늘 미입력 모달이 즉시 뜨고 저장된다`, async ({
    page,
  }) => {
    const { selectedFestival, saved } = await mockConsole(page, { role });
    await page.goto("/console");

    await page.getByRole("link", { name: new RegExp(selectedFestival.festivalName) }).click();
    await expect(page).toHaveURL(
      role === "FESTIVAL_OWNER"
        ? `/console/festivals/${festivalId}`
        : `/console/festivals/${festivalId}/dashboard`,
    );

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("1일차")).toHaveValue("1,200");
    await expect(dialog.getByLabel("2일차")).toHaveValue("");
    await expect(dialog.getByLabel("3일차")).toHaveCount(0);

    await dialog.getByLabel("2일차").fill("2,432");
    await dialog.getByRole("button", { name: "입력하기", exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(saved).toEqual([{ visitDate: isoDate(0), visitorCount: 2432 }]);
  });
}

for (const progressStatus of ["UPCOMING", "COMPLETED"] as const) {
  test(`${progressStatus} 축제 내부 화면에서는 방문 인원 모달을 띄우지 않는다`, async ({
    page,
  }) => {
    const { visitorRequests } = await mockConsole(page, {
      role: "FESTIVAL_OWNER",
      progressStatus,
      counts: [null, null],
    });

    await page.goto(`/console/festivals/${festivalId}`);

    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(visitorRequests).toEqual([]);
  });
}
