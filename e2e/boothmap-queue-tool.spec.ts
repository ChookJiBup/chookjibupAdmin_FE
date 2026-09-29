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
    existingPlan?: boolean;
    aiUnavailable?: boolean;
    existingCurrent?: boolean;
  } = {},
) {
  const planPath = `/api/festivals/${festivalId}/operations/booths/501/queue-plan`;
  const points = [
    { lat: 35.1495, lng: 126.9195 },
    { lat: 35.1499, lng: 126.9195 },
  ];
  let savedPlan: unknown = options.existingPlan
    ? {
        path: points,
        planId: "plan-1",
        boothId: 501,
        revision: 4,
        nodeVersion: 3,
        lengthMeters: 44,
        estimatedCapacity: 44,
        metersPerPerson: 1,
        servedPersonsPerMinute: 2,
        sourceNodeId: null,
      }
    : null;
  const planWrites: Record<string, unknown>[] = [];
  const planDeletes: Record<string, unknown>[] = [];
  const queueWrites: Record<string, unknown>[] = [];
  let recommendations = 0;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown;
    let code = 0;
    if (path === planPath) {
      if (request.method() === "DELETE") {
        const payload = request.postDataJSON();
        planDeletes.push(payload);
        savedPlan = {
          ...(savedPlan as Record<string, unknown>),
          path: [],
          lengthMeters: 0,
          estimatedCapacity: 0,
          revision: Number(payload.expectedRevision) + 1,
        };
      }
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
          revision: Number(request.postDataJSON().expectedRevision) + 1,
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
    } else if (path === `${planPath}/recommendations/status`) {
      data = {
        available: !options.aiUnavailable,
        reason: options.aiUnavailable
          ? "서버에 AI 인증 설정이 없습니다. 운영자가 APP_OPENAI_API_KEY를 설정해야 합니다."
          : null,
      };
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
                path: options.existingCurrent ? points : null,
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
    planDeletes,
    queueWrites,
    get recommendations() {
      return recommendations;
    },
  };
}

test("직접 설정은 지도에서 경로를 찍는 화면을 열고 좌표 입력은 표시하지 않는다", async ({
  page,
}) => {
  const calls = await mockBoothMap(page, { existingPlan: true });
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  const actions = page.getByRole("region", { name: "김밥천국 줄 관리" });
  await expect(actions.getByRole("button", { name: "AI 추천" })).toBeVisible();
  await actions.getByRole("button", { name: "줄 직접 설정" }).click();
  await expect(page.getByText("지도에서 줄이 꺾이는 지점을 순서대로 찍어 주세요.")).toBeVisible();
  await expect(page.getByRole("button", { name: "마지막 점 지우기" })).toBeDisabled();
  await expect(page.getByText("찍은 지점 0개")).toBeVisible();
  await expect(page.getByRole("button", { name: "대기줄 저장" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "좌표 직접 입력" })).toHaveCount(0);
  expect(calls.recommendations).toBe(0);
});

test("AI 추천 버튼은 추천 요청을 바로 시작한다", async ({ page }) => {
  const calls = await mockBoothMap(page, { boundary: true });
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page
    .getByRole("region", { name: "김밥천국 줄 관리" })
    .getByRole("button", { name: "AI 추천" })
    .click();
  await expect.poll(() => calls.recommendations).toBe(1);
});

test("AI 추천 결과는 저장 전 미리보기로 표시한다", async ({ page }) => {
  const calls = await mockBoothMap(page, { boundary: true });
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page
    .getByRole("region", { name: "김밥천국 줄 관리" })
    .getByRole("button", { name: "AI 추천" })
    .click();
  const panel = page.getByRole("region", { name: "사전 줄 설정" });
  await expect(panel.getByText("총 길이")).toBeVisible();
  await expect(panel.getByText("44m")).toBeVisible();
  await expect(panel.getByRole("button", { name: "대기줄 저장" })).toBeEnabled();
  expect(calls.planWrites).toHaveLength(0);
});

test("줄 직접 설정의 X는 편집과 부스 선택을 함께 닫는다", async ({ page }) => {
  await mockBoothMap(page, { existingPlan: true });
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page.getByRole("button", { name: "줄 직접 설정" }).click();
  await page
    .getByRole("region", { name: "사전 줄 설정" })
    .getByRole("button", { name: "그만두기" })
    .click();
  await expect(page.getByRole("region", { name: "사전 줄 설정" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "김밥천국 줄 관리" })).toHaveCount(0);
});

test("관리자 줄끝 갱신은 사전 동선의 존을 선택해 저장한다", async ({ page }) => {
  const calls = await mockBoothMap(page, { existingPlan: true });
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page.getByRole("button", { name: "줄끝 갱신", exact: true }).last().click();
  const panel = page.getByRole("region", { name: "줄끝 갱신" });
  await panel.getByRole("combobox", { name: "줄끝 존 선택" }).click();
  await page.getByRole("option", { name: "존 2 · 20m" }).click();
  await panel.getByRole("button", { name: "줄끝 갱신", exact: true }).click();
  await expect(panel).toHaveCount(0);
  expect(calls.queueWrites[0]).toMatchObject({ expectedRevision: 0, planRevision: 4 });
  expect(calls.queueWrites[0]).not.toHaveProperty("queueTailMeters");
});

test("사전 동선이 없어도 관리자 줄끝 갱신은 거리 존을 저장한다", async ({ page }) => {
  const calls = await mockBoothMap(page);
  await page.goto(boothmapPath);
  await page.getByRole("button", { name: "김밥천국", exact: true }).first().click();
  await page.getByRole("button", { name: "줄끝 갱신", exact: true }).last().click();
  const panel = page.getByRole("region", { name: "줄끝 갱신" });
  await panel.getByRole("combobox", { name: "줄끝 존 선택" }).click();
  await page.getByRole("option", { name: "존 2 · 20m" }).click();
  await panel.getByRole("button", { name: "줄끝 갱신", exact: true }).click();
  await expect(panel).toHaveCount(0);
  expect(calls.queueWrites[0]).toMatchObject({
    expectedRevision: 0,
    queueTailMeters: 20,
    path: [],
  });
});
