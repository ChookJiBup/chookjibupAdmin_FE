import { expect, test, type Page } from "@playwright/test";

const festivalId = "00000000-0000-0000-0000-000000000041";
const mapId = "00000000-0000-0000-0000-0000000000d1";
const boothNodeId = "00000000-0000-0000-0000-0000000000a1";
const lineNodeId = "00000000-0000-0000-0000-0000000000a2";
const boothmapPath = `/console/festivals/${festivalId}/boothmap`;

/**
 * 대기줄 도구는 부스를 고른 상태에서만 열린다.
 *
 * 여기서는 «부스를 고르면 버튼이 열린다»는 연결만 지킨다. 이 환경에는 카카오 지도가
 * 없어 지도 위 말풍선이 렌더되지 않으므로, 말풍선의 바깥 클릭 판정까지는 재현되지
 * 않는다. 그 판정은 keepsPopoverOpen 단위 테스트가 맡는다.
 */
async function mockBoothMap(
  page: Page,
  options: {
    boundary?: boolean;
    role?: string;
    conflict?: boolean;
    aiFailure?: boolean;
    missingVersion?: boolean;
    planDelay?: Promise<void>;
    queueDelay?: Promise<void>;
    noQueue?: boolean;
    unapproved?: boolean;
  } = {},
) {
  const planPath = `/api/festivals/${festivalId}/operations/booths/501/queue-plan`;
  const points = [
    { lat: 35.1495, lng: 126.9195 },
    { lat: 35.1499, lng: 126.9195 },
  ];
  let savedPlan: unknown = null;
  const planWrites: Record<string, unknown>[] = [];
  const queueWrites: Record<string, unknown>[] = [];
  let recommendations = 0;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown;
    let code = 0;
    if (path === planPath) {
      if (request.method() === "GET") await options.planDelay;
      if (request.method() === "PUT") {
        planWrites.push(request.postDataJSON());
        if (options.conflict)
          return route.fulfill({
            status: 409,
            json: { code: 40922, message: "REVISION_CONFLICT", data: null },
          });
        savedPlan = {
          ...request.postDataJSON(),
          planId: "plan-1",
          boothId: 501,
          revision: 1,
          nodeVersion: 3,
          lengthMeters: 44,
          estimatedCapacity: 44,
        };
      }
      data = savedPlan ?? undefined;
      code = 40413;
    } else if (path === `${planPath}/candidates`) {
      data = [
        {
          sourceNodeId: lineNodeId,
          name: "도면 대기선",
          source: "AI",
          path: points,
          expectedRevision: 0,
          expectedNodeVersion: 3,
        },
      ];
    } else if (path === `${planPath}/recommendations`) {
      recommendations++;
      if (options.aiFailure)
        return route.fulfill({
          status: 503,
          json: { code: 50303, message: "추천 서비스를 사용할 수 없습니다.", data: null },
        });
      data = {
        path: points,
        reason: "출입구를 피해 배치했습니다.",
        lengthMeters: 44,
        expectedRevision: 0,
        expectedNodeVersion: 3,
        warnings: ["현장 통행 여유를 확인하세요."],
      };
    } else if (path.includes("/operations/queues/") && request.method() === "PATCH") {
      queueWrites.push(request.postDataJSON());
      await options.queueDelay;
      data = {
        ...request.postDataJSON(),
        queueId: path.split("/").at(-1),
        boothId: 501,
        boothName: "김밥천국",
        waitMinutes: 10,
        observationRevision: 1,
      };
    } else if (path === "/api/admin/me") {
      data = {
        adminId: "00000000-0000-0000-0000-000000000001",
        email: "queue-test@example.com",
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
        role: options.role ?? "FESTIVAL_OWNER",
        festivalStatus: "DRAFT",
        progressStatus: "UPCOMING",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
        locations: [{ primary: true, latitude: 35.1495, longitude: 126.9195 }],
      };
    } else if (path === `/api/festivals/${festivalId}/maps/current`) {
      data = {
        mapId,
        mapName: "테스트 배치",
        editRevision: 1,
        roadmapStatus: "EDITING",
        center: { lat: 35.1495, lng: 126.9195 },
      };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/editor`) {
      data = {
        mapId,
        editRevision: 1,
        roadmapStatus: "EDITING",
        center: { lat: 35.1495, lng: 126.9195 },
        nodes: [
          {
            version: options.missingVersion ? undefined : 3,
            nodeId: boothNodeId,
            nodeType: "BOOTH",
            name: "김밥천국",
            geometryType: "POINT",
            geometry: { lat: 35.1495, lng: 126.9195 },
            confidence: null,
            recognizedText: null,
            source: "ADMIN",
            reviewStatus: "CONFIRMED",
            sortOrder: 0,
            geometrySchemaVersion: "2.0",
            // 승인된 운영 부스와 이어져 있어야 대기줄을 그릴 수 있다.
            relatedBoothId: options.unapproved ? null : 501,
          },
          {
            nodeId: lineNodeId,
            nodeType: "QUEUE",
            name: "도면 대기선",
            geometryType: "POLYLINE",
            geometry: { points },
            confidence: 0.9,
            source: "AI",
            reviewStatus: "CONFIRMED",
            sortOrder: 1,
            geometrySchemaVersion: "2.0",
            version: 1,
          },
        ],
        zones: [],
        presentation: options.boundary
          ? {
              boundary: {
                geometryType: "POLYGON",
                schemaVersion: "2.0",
                points: [
                  { lat: 35.149, lng: 126.919 },
                  { lat: 35.149, lng: 126.92 },
                  { lat: 35.15, lng: 126.92 },
                  { lat: 35.15, lng: 126.919 },
                ],
              },
              overlay: null,
            }
          : undefined,
      };
    } else if (path === `/api/festivals/${festivalId}/operations/queues`) {
      data = {
        queues: options.noQueue
          ? []
          : [
              {
                queueId: "00000000-0000-0000-0000-0000000000b1",
                boothId: 501,
                boothName: "김밥천국",
                tailLatitude: null,
                tailLongitude: null,
                queueTailMeters: null,
                path: null,
                lastModifierType: null,
                lastModifierName: null,
                updatedAt: "2026-09-09T00:00:00",
                observationRevision: 0,
                waitMinutes: null,
                observedAt: null,
              },
            ],
      };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/analysis`) {
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
  return {
    planWrites,
    queueWrites,
    get recommendations() {
      return recommendations;
    },
  };
}

async function openPlan(page: Page) {
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page.getByRole("button", { name: "사전 줄 설정", exact: true }).click();
}

test("부스 선택에 직접 설정·AI·현재 줄 UI를 표시하고 AI 설정으로 진입한다", async ({ page }) => {
  const calls = await mockBoothMap(page, { boundary: true });
  await page.goto(boothmapPath);
  await expect(page.getByRole("region", { name: "김밥천국 줄 관리" })).toHaveCount(0);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  const actions = page.getByRole("region", { name: "김밥천국 줄 관리" });
  await expect(actions.getByRole("button", { name: "줄 직접 설정" })).toBeEnabled();
  await expect(actions.getByRole("button", { name: "현재 줄 기록" })).toBeEnabled();
  await actions.getByRole("button", { name: "AI 줄 설정", exact: true }).click();
  await expect(
    page.getByText("간격·처리 인원·목표 수용 인원을 확인하고", { exact: false }),
  ).toBeVisible();
  expect(calls.recommendations).toBe(0);
  await page.getByRole("button", { name: "AI로 사전 줄 추천" }).click();
  await expect(page.getByText("추천 이유: 출입구를 피해 배치했습니다.")).toBeVisible();
  expect(calls.planWrites).toHaveLength(0);
});

test("현재 대기열이 없어도 승인된 부스의 사전 줄은 확정할 수 있다", async ({ page }) => {
  const calls = await mockBoothMap(page, { noQueue: true });
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  const actions = page.getByRole("region", { name: "김밥천국 줄 관리" });
  await expect(actions.getByRole("button", { name: "현재 줄 기록" })).toBeDisabled();
  await actions.getByRole("button", { name: "줄 직접 설정" }).click();
  await page.getByRole("button", { name: "도면 대기선 (AI 인식)" }).click();
  await expect(page.getByRole("button", { name: "사전 줄 확정" })).toBeEnabled();
  await page.getByRole("button", { name: "사전 줄 확정" }).click();
  await expect(page.getByText("사전 줄을 설정했습니다.", { exact: false })).toBeVisible();
  expect(calls.planWrites).toHaveLength(1);
  expect(calls.queueWrites).toHaveLength(0);
});

test("미승인 부스는 줄 설정이 불가능한 이유를 선택 화면에서 안내한다", async ({ page }) => {
  await mockBoothMap(page, { noQueue: true, unapproved: true });
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  const actions = page.getByRole("region", { name: "김밥천국 줄 관리" });
  await expect(actions.getByRole("button", { name: "줄 직접 설정" })).toBeDisabled();
  await expect(
    actions.getByText("부스를 지도에 저장하고 운영 부스로 승인해 주세요."),
  ).toBeVisible();
});

test("도면 후보는 사전 줄 확정으로만 저장하고 Enter는 실제 관측을 쓰지 않는다", async ({
  page,
}) => {
  const calls = await mockBoothMap(page);
  await openPlan(page);
  await page.getByRole("button", { name: "도면 대기선 (AI 인식)" }).click();
  await page.keyboard.press("Enter");
  expect(calls.queueWrites).toHaveLength(0);
  expect(calls.planWrites).toHaveLength(0);
  await page.getByRole("button", { name: "사전 줄 확정" }).click();
  await expect(page.getByText("사전 줄을 설정했습니다.", { exact: false })).toBeVisible();
  expect(calls.planWrites[0]).toMatchObject({
    expectedRevision: 0,
    expectedNodeVersion: 3,
    metersPerPerson: 1,
    servedPersonsPerMinute: 2,
    sourceNodeId: lineNodeId,
  });
  expect(calls.queueWrites).toHaveLength(0);
});

test("AI 추천은 미리보기와 이유를 보여주고 별도 확정한다", async ({ page }) => {
  const calls = await mockBoothMap(page, { boundary: true });
  await openPlan(page);
  await page.getByRole("button", { name: "AI로 사전 줄 추천" }).click();
  await expect(page.getByText("추천 이유: 출입구를 피해 배치했습니다.")).toBeVisible();
  await expect(page.getByText("현장 통행 여유를 확인하세요.")).toBeVisible();
  expect(calls.planWrites).toHaveLength(0);
  await page.screenshot({ path: "test-results/queue-plan-preview.png", fullPage: true });
  await page.getByRole("button", { name: "사전 줄 확정" }).click();
  await expect(page.getByText("사전 줄을 설정했습니다.", { exact: false })).toBeVisible();
  expect(calls.recommendations).toBe(1);
  expect(calls.planWrites[0].sourceNodeId).toBeNull();
});

test("경계 없는 AI와 운영자 사전 수정을 차단한다", async ({ page }) => {
  await mockBoothMap(page);
  await openPlan(page);
  await expect(page.getByRole("button", { name: "AI로 사전 줄 추천" })).toBeDisabled();
  await page
    .getByRole("region", { name: "사전 줄 설정" })
    .getByRole("button", { name: "닫기", exact: true })
    .click();
  await page.unrouteAll();
  await mockBoothMap(page, { role: "SUB_ADMIN" });
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/festivals/${festivalId}/dashboard$`));
  await expect(page.getByRole("button", { name: "사전 줄 설정", exact: true })).toHaveCount(0);
});

test("사전 저장 충돌은 재확정을 막고 AI 실패는 실제 관측에 영향이 없다", async ({ page }) => {
  const calls = await mockBoothMap(page, { conflict: true });
  await openPlan(page);
  await page.getByRole("button", { name: "도면 대기선 (AI 인식)" }).click();
  await page.getByRole("button", { name: "사전 줄 확정" }).click();
  await expect(page.getByRole("region", { name: "사전 줄 설정" }).getByRole("alert")).toContainText(
    "다른 수정",
  );
  await expect(page.getByRole("button", { name: "사전 줄 확정" })).toBeDisabled();
  expect(calls.queueWrites).toHaveLength(0);
});

test("AI 오류를 표시하며 미확정 경로를 저장하지 않는다", async ({ page }) => {
  const calls = await mockBoothMap(page, { boundary: true, aiFailure: true });
  await openPlan(page);
  await page.getByRole("button", { name: "AI로 사전 줄 추천" }).click();
  await expect(page.getByRole("region", { name: "사전 줄 설정" }).getByRole("alert")).toBeVisible();
  expect(calls.planWrites).toHaveLength(0);
  expect(calls.queueWrites).toHaveLength(0);
});

test("지도 버전이 없으면 사전 줄을 확정하지 않는다", async ({ page }) => {
  const calls = await mockBoothMap(page, { missingVersion: true });
  await openPlan(page);
  await expect(
    page.getByText("지도 버전이 없습니다. BE 업데이트 후 지도를 다시 불러와 주세요."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "사전 줄 확정" })).toBeDisabled();
  expect(calls.planWrites).toHaveLength(0);
});

test("현재 경로는 관리자 PATCH와 관측 리비전으로 저장하며 시간 입력이 필요 없다", async ({
  page,
}) => {
  const calls = await mockBoothMap(page);
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page.getByRole("button", { name: "대기줄 추가" }).click();
  await page.getByRole("button", { name: "참고선 가져오기" }).click();
  await page.getByRole("button", { name: "도면 대기선 점 2개" }).click();
  await page.getByRole("button", { name: "대기줄 저장", exact: true }).click();
  await expect(page.getByText("현재 대기줄과 자동 대기시간이 갱신되었습니다.")).toBeVisible();
  expect(calls.queueWrites).toHaveLength(1);
  expect(calls.queueWrites[0]).toMatchObject({
    expectedRevision: 0,
    tailLatitude: 35.1499,
    tailLongitude: 126.9195,
  });
  expect(calls.queueWrites[0].path).toHaveLength(2);
  expect(calls.queueWrites[0]).not.toHaveProperty("queueTailMeters");
  expect(calls.planWrites).toHaveLength(0);
});

test("줄끝 모드에서 참고선을 가져와도 경로를 생략하고 마지막 지점만 전송한다", async ({ page }) => {
  const calls = await mockBoothMap(page);
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page.getByRole("button", { name: "대기줄 추가" }).click();
  await page.getByRole("button", { name: "줄끝만 선택" }).click();
  await page.getByRole("button", { name: "참고선 가져오기" }).click();
  await page.getByRole("button", { name: "도면 대기선 점 2개" }).click();
  await page.getByRole("button", { name: "대기줄 저장", exact: true }).click();
  await expect(page.getByText("현재 대기줄과 자동 대기시간이 갱신되었습니다.")).toBeVisible();
  expect(calls.queueWrites[0]).toMatchObject({
    tailLatitude: 35.1499,
    tailLongitude: 126.9195,
    expectedRevision: 0,
  });
  expect(calls.queueWrites[0]).not.toHaveProperty("path");
});

test("설정 조회 중 입력을 잠가 늦은 응답이 사용자 입력을 덮어쓰지 않는다", async ({ page }) => {
  let release!: () => void;
  const planDelay = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockBoothMap(page, { planDelay });
  try {
    await openPlan(page);
    await expect(page.getByLabel("대기자 간격(m)")).toBeDisabled();
    await expect(page.getByLabel("분당 처리 인원(전체 창구 합계)")).toBeDisabled();
    release();
    await expect(page.getByLabel("대기자 간격(m)")).toBeEnabled();
  } finally {
    release();
  }
});

test("늦게 도착한 현재 줄 저장 응답은 새 사전 설정 패널을 닫지 않는다", async ({ page }) => {
  let release!: () => void;
  const queueDelay = new Promise<void>((resolve) => {
    release = resolve;
  });
  const calls = await mockBoothMap(page, { queueDelay });
  try {
    await page.goto(boothmapPath);
    await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
    await page.getByRole("button", { name: "대기줄 추가" }).click();
    await page.getByRole("button", { name: "참고선 가져오기" }).click();
    await page.getByRole("button", { name: "도면 대기선 점 2개" }).click();
    await page.getByRole("button", { name: "대기줄 저장", exact: true }).click();
    await expect.poll(() => calls.queueWrites.length).toBe(1);
    await page.getByRole("button", { name: "사전 줄 설정", exact: true }).click();
    release();
    await expect(page.getByText("현재 대기줄과 자동 대기시간이 갱신되었습니다.")).toBeVisible();
    await expect(page.getByRole("region", { name: "사전 줄 설정" })).toBeVisible();
  } finally {
    release();
  }
});

test("부스를 고른 뒤 대기줄 버튼을 누르면 대기줄 도구가 열린다", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockBoothMap(page);
  await page.goto(boothmapPath);

  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();

  const queueButton = page.getByRole("button", { name: "대기줄 추가" });
  await expect(queueButton).toBeEnabled();
  await queueButton.click();

  await expect(queueButton).toHaveAttribute("aria-pressed", "true");
  // 도구를 켜도 부스 선택은 살아 있어야 대기줄을 그 부스에 붙일 수 있다.
  await expect(queueButton).toBeEnabled();
});
