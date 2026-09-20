import { expect, test, type Page } from "@playwright/test";

/*
  다중 선택·통째 이동·구역 배치·줄 세우기를 지도 위 실제 조작으로 확인한다.

  이 화면은 손으로 끌어 쓰는 기능이 대부분이라 단위 테스트로는 «좌표를 옮기는 함수»까지만
  덮인다. 정작 깨지는 곳은 포인터 이벤트가 카카오맵·말풍선·하단 바와 얽히는 자리라
  브라우저에서 실제로 끌어 봐야 한다.
*/

const festivalId = "00000000-0000-0000-0000-000000000030";
const mapId = "00000000-0000-0000-0000-0000000000b0";
const boothmapPath = `/console/festivals/${festivalId}/boothmap`;

const CENTER = { lat: 35.1495, lng: 126.9195 };

/** 구역 폴리곤 «먹거리존» 안에 드는 부스 3개와, 폴리곤 밖 부스 2개. */
const BOOTHS = [
  { id: "node-1", name: "김밥천국", lat: 35.1497, lng: 126.9193 },
  { id: "node-2", name: "떡볶이존", lat: 35.1497, lng: 126.9197 },
  { id: "node-3", name: "튀김마차", lat: 35.1494, lng: 126.9195 },
  { id: "node-4", name: "굿즈샵", lat: 35.1489, lng: 126.9188 },
  { id: "node-5", name: "포토존", lat: 35.1489, lng: 126.9202 },
  { id: "node-6", name: "푸드트럭", lat: 35.1486, lng: 126.9188 },
  { id: "node-7", name: "플리마켓", lat: 35.1486, lng: 126.9202 },
];

/** 위 세 부스를 넉넉히 감싸는 사각 구역. */
const ZONE_POLYGON = [
  { lat: 35.1499, lng: 126.919 },
  { lat: 35.1499, lng: 126.92 },
  { lat: 35.1492, lng: 126.92 },
  { lat: 35.1492, lng: 126.919 },
];

function editorNodes() {
  const pins = BOOTHS.map((booth, index) => ({
    nodeId: booth.id,
    nodeType: "BOOTH" as const,
    name: booth.name,
    geometryType: "POINT" as const,
    geometry: { lat: booth.lat, lng: booth.lng },
    confidence: null,
    recognizedText: null,
    source: "MANUAL" as const,
    reviewStatus: "OK" as const,
    sortOrder: index,
    geometrySchemaVersion: "2.0",
  }));
  return [
    ...pins,
    {
      nodeId: "node-zone-food",
      nodeType: "OPEN_SPACE" as const,
      name: "먹거리존",
      geometryType: "POLYGON" as const,
      geometry: { points: ZONE_POLYGON },
      confidence: null,
      recognizedText: null,
      source: "MANUAL" as const,
      reviewStatus: "OK" as const,
      sortOrder: pins.length,
      geometrySchemaVersion: "2.0",
    },
  ];
}

interface SaveBody {
  nodes: { nodeId: string | null; name: string; geometry: Record<string, unknown> }[];
  zones?: { zoneId: string; name: string; sortOrder: number; boothNodeIds: string[] }[];
}

async function mockBoothMap(page: Page, options: { saveDelayMs?: number } = {}) {
  const saves: SaveBody[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const isSave =
      request.method() === "PUT" && path === `/api/festivals/${festivalId}/maps/${mapId}/editor`;
    if (isSave) {
      saves.push(request.postDataJSON() as SaveBody);
      if (options.saveDelayMs) await new Promise((r) => setTimeout(r, options.saveDelayMs));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ code: 0, message: "OK", data: { editRevision: 4 } }),
      });
      return;
    }

    let data: unknown;
    let code = 0;
    if (path === "/api/admin/me") {
      data = {
        adminId: "00000000-0000-0000-0000-000000000001",
        email: "multiselect@example.com",
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
        locations: [{ primary: true, latitude: CENTER.lat, longitude: CENTER.lng }],
      };
    } else if (path === `/api/festivals/${festivalId}/maps/current`) {
      data = {
        mapId,
        mapName: "테스트 배치",
        editRevision: 3,
        roadmapStatus: "EDITING",
        center: CENTER,
      };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/editor`) {
      data = {
        mapId,
        editRevision: 3,
        roadmapStatus: "EDITING",
        center: CENTER,
        nodes: editorNodes(),
        zones: [],
      };
    } else if (path === `/api/festivals/${festivalId}/maps/${mapId}/analysis`) {
      code = 40406;
    } else if (path.endsWith("/booths/approve")) {
      data = { approvedCount: 0, booths: [] };
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
  return saves;
}

/** 지도 안의 화면 좌표. 카카오가 뜨지 않는 환경에서도 지도 영역 자체는 잡힌다. */
async function mapBox(page: Page) {
  const box = await page.locator(".isolate").first().boundingBox();
  if (!box) throw new Error("지도 영역을 찾지 못했습니다.");
  return box;
}

/** 부스 핀 버튼의 화면 중심. */
async function pinCenter(page: Page, name: string) {
  const box = await page.locator(`button[aria-label="${name}"]`).first().boundingBox();
  if (!box) throw new Error(`${name} 핀을 찾지 못했습니다.`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  modifier?: "Shift",
) {
  if (modifier) await page.keyboard.down(modifier);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // 손떨림 판정(5px)을 넘기고 카카오가 중간 이동을 따라오도록 여러 번 나눠 움직인다.
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.up();
  if (modifier) await page.keyboard.up(modifier);
}

/** 저장 요청에서 이 부스의 좌표를 꺼낸다. */
function savedPoint(save: SaveBody, nodeId: string) {
  const node = save.nodes.find((n) => n.nodeId === nodeId);
  if (!node) throw new Error(`${nodeId}가 저장 요청에 없습니다.`);
  return node.geometry as { lat: number; lng: number };
}

/**
 * 편집기를 열고 지도가 실제로 떴는지 확인한다.
 *
 * 카카오맵은 등록된 도메인에서만 뜬다. CI가 쓰는 127.0.0.1:3100에서는 키 도메인이 맞지
 * 않아 지도가 아예 렌더되지 않아, 지도 위를 끌어야 하는 이 파일의 검증은 성립하지 않는다.
 * 그럴 때는 조용히 통과시키지 말고 건너뛴 사실을 남긴다 — localhost:3000에서 돌리면 된다.
 */
async function openEditor(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(boothmapPath);
  await expect(page.getByRole("button", { name: "김밥천국", exact: true }).first()).toBeVisible();
  const mapPin = page.locator('button[aria-label="김밥천국"]');
  const mapReady = await mapPin
    .first()
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!mapReady, "카카오맵이 뜨지 않는 호스트입니다(localhost:3000에서 실행하세요).");
}

async function save(page: Page) {
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "저장", exact: true }).click();
}

test("Shift+드래그로 범위 안의 부스를 한꺼번에 고른다", async ({ page }) => {
  await mockBoothMap(page);
  await openEditor(page);

  const box = await mapBox(page);
  // 지도 왼쪽 위에서 가운데까지 훑어 폴리곤 안 부스 3개를 담는다.
  await drag(
    page,
    { x: box.x + box.width * 0.25, y: box.y + box.height * 0.2 },
    { x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 },
    "Shift",
  );

  // 하단 바는 둘 이상 골랐을 때만 뜬다. 뜬다는 것 자체가 다중 선택이 됐다는 뜻이다.
  await expect(page.getByText(/개 선택됨/)).toBeVisible();
  await expect(page.getByRole("button", { name: "그룹화", exact: true })).toBeEnabled();
});

test("범위 선택 도구로 고른 부스들이 같은 거리만큼 함께 움직인다", async ({ page }) => {
  const saves = await mockBoothMap(page);
  await openEditor(page);

  await page.getByRole("button", { name: "범위 선택", exact: true }).click();
  const box = await mapBox(page);
  await drag(
    page,
    { x: box.x + box.width * 0.25, y: box.y + box.height * 0.2 },
    { x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 },
  );
  await expect(page.getByText(/개 선택됨/)).toBeVisible();

  // 고른 것 중 하나를 끌면 나머지도 같은 만큼 간다.
  const before = await pinCenter(page, "김밥천국");
  await drag(page, before, { x: before.x + 120, y: before.y + 60 });
  await save(page);
  await expect.poll(() => saves.length).toBe(1);

  const moved = ["node-1", "node-2", "node-3"].map((id) => ({
    id,
    dLat: savedPoint(saves[0], id).lat - BOOTHS.find((b) => b.id === id)!.lat,
    dLng: savedPoint(saves[0], id).lng - BOOTHS.find((b) => b.id === id)!.lng,
  }));
  // 실제로 움직였고
  expect(Math.abs(moved[0].dLat)).toBeGreaterThan(1e-6);
  // 셋의 이동량이 같다(같은 델타를 더했으므로 소수점 아래까지 같아야 한다).
  moved.forEach((m) => {
    expect(Math.abs(m.dLat - moved[0].dLat)).toBeLessThan(1e-12);
    expect(Math.abs(m.dLng - moved[0].dLng)).toBeLessThan(1e-12);
  });
});

test("구역 폴리곤을 끌면 그 안의 부스도 함께 간다", async ({ page }) => {
  const saves = await mockBoothMap(page);
  await openEditor(page);

  // 폴리곤 안쪽(부스가 없는 자리)을 잡아 끈다.
  const box = await mapBox(page);
  const inside = { x: box.x + box.width / 2 + 40, y: box.y + box.height / 2 - 30 };
  await drag(page, inside, { x: inside.x + 100, y: inside.y + 80 });
  await save(page);
  await expect.poll(() => saves.length).toBe(1);

  const zoneNode = saves[0].nodes.find((n) => n.nodeId === "node-zone-food")!;
  const zonePoints = (zoneNode.geometry as { points: { lat: number; lng: number }[] }).points;
  const zoneDLat = zonePoints[0].lat - ZONE_POLYGON[0].lat;
  const zoneDLng = zonePoints[0].lng - ZONE_POLYGON[0].lng;
  expect(Math.abs(zoneDLat)).toBeGreaterThan(1e-6);

  // 안에 있던 부스 3개가 폴리곤과 같은 만큼 움직여 소속이 끊기지 않았다.
  ["node-1", "node-2", "node-3"].forEach((id) => {
    const origin = BOOTHS.find((b) => b.id === id)!;
    const after = savedPoint(saves[0], id);
    expect(Math.abs(after.lat - origin.lat - zoneDLat)).toBeLessThan(1e-12);
    expect(Math.abs(after.lng - origin.lng - zoneDLng)).toBeLessThan(1e-12);
  });
  // 밖에 있던 부스는 제자리다.
  ["node-4", "node-5", "node-6", "node-7"].forEach((id) => {
    const origin = BOOTHS.find((b) => b.id === id)!;
    const after = savedPoint(saves[0], id);
    expect(after.lat).toBeCloseTo(origin.lat, 12);
    expect(after.lng).toBeCloseTo(origin.lng, 12);
  });
});

test("구역에 넣기로 고른 부스를 구역 안으로 옮긴다", async ({ page }) => {
  const saves = await mockBoothMap(page);
  await openEditor(page);

  // 폴리곤 밖 부스 두 개만 고른다.
  await page.getByRole("button", { name: "굿즈샵", exact: true }).first().click();
  await page.keyboard.down("Shift");
  await page.getByRole("button", { name: "포토존", exact: true }).first().click();
  await page.keyboard.up("Shift");
  await expect(page.getByText(/2개 선택됨/)).toBeVisible();

  await page.getByRole("button", { name: "구역에 넣기", exact: true }).click();
  await page.getByRole("button", { name: "먹거리존 폴리곤", exact: true }).click();
  await expect(page.getByText(/먹거리존에 부스 2개를 넣었습니다/)).toBeVisible();

  await save(page);
  await expect.poll(() => saves.length).toBe(1);
  const zone = saves[0].zones?.find((z) => z.name === "먹거리존");
  expect(zone).toBeTruthy();
  // 원래 안에 있던 3개 + 새로 넣은 2개.
  expect(zone!.boothNodeIds.sort()).toEqual(
    ["node-1", "node-2", "node-3", "node-4", "node-5"].sort(),
  );
  // 넣지 않은 부스는 그대로 밖에 남는다.
  expect(zone!.boothNodeIds).not.toContain("node-6");
});

test("줄 세우기는 고른 부스를 한 줄로 다시 놓는다", async ({ page }) => {
  const saves = await mockBoothMap(page);
  await openEditor(page);

  await page.getByRole("button", { name: "범위 선택", exact: true }).click();
  const box = await mapBox(page);
  await drag(
    page,
    { x: box.x + box.width * 0.25, y: box.y + box.height * 0.2 },
    { x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 },
  );
  await page.getByRole("button", { name: "줄 세우기", exact: true }).click();
  await expect(page.getByText(/줄 세웠습니다/)).toBeVisible();

  await save(page);
  await expect.poll(() => saves.length).toBe(1);
  const points = ["node-1", "node-2", "node-3"].map((id) => savedPoint(saves[0], id));
  // 세 점이 한 직선 위에 있다 — 외적이 0이면 일직선이다.
  const cross =
    (points[1].lng - points[0].lng) * (points[2].lat - points[0].lat) -
    (points[1].lat - points[0].lat) * (points[2].lng - points[0].lng);
  expect(Math.abs(cross)).toBeLessThan(1e-14);
});

test("구역 순서를 바꾸면 저장 요청의 sortOrder가 따라 바뀐다", async ({ page }) => {
  const saves = await mockBoothMap(page);
  await openEditor(page);

  /*
    묶어 만든 구역 둘을 세운다. 순서 버튼은 같은 종류끼리만 자리를 바꾼다 — 목록이
    «묶음 구역»과 «폴리곤 구역» 두 묶음으로 나뉘어 있기 때문이다.
  */
  const group = async (first: string, second: string, name: string) => {
    await page.getByRole("button", { name: first, exact: true }).first().click();
    await page.keyboard.down("Shift");
    await page.getByRole("button", { name: second, exact: true }).first().click();
    await page.keyboard.up("Shift");
    await page.getByRole("button", { name: "그룹화", exact: true }).click();
    await page.getByRole("textbox", { name: "이름" }).fill(name);
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await page.keyboard.press("Escape");
  };
  await group("굿즈샵", "포토존", "체험존");
  await group("푸드트럭", "플리마켓", "야시장존");

  /*
    저장하면 서버 응답으로 목록을 다시 채우느라 행이 통째로 새로 그려진다. 순서를 먼저
    바꾸고 저장은 한 번만 해, 다시 그리는 도중의 행을 누르는 일이 없게 한다.
  */
  const zoneNames = () =>
    page
      .locator('[aria-label$="순서 내리기"]')
      .evaluateAll((els) =>
        els.map((el) => (el.getAttribute("aria-label") ?? "").replace(" 순서 내리기", "")),
      );
  expect(await zoneNames()).toEqual(["체험존", "야시장존", "먹거리존"]);

  await page.getByRole("button", { name: "체험존 순서 내리기" }).click();
  expect(await zoneNames()).toEqual(["야시장존", "체험존", "먹거리존"]);

  await save(page);
  await expect.poll(() => saves.length).toBe(1);
  const saved = saves[0].zones!.map((z) => z.name);
  expect(saved).toEqual(["야시장존", "체험존", "먹거리존"]);
  // sortOrder는 저장 배열 순서를 그대로 따른다.
  saves[0].zones!.forEach((zone, index) => expect(zone.sortOrder).toBe(index));
});

test("휠을 위로 굴리면 지도가 확대된다", async ({ page }) => {
  await mockBoothMap(page);
  await openEditor(page);

  /*
    카카오가 그리는 축척 막대를 읽는다. 확대할수록 막대가 가리키는 거리가 짧아지므로
    «100m → 50m»이면 확대, 그 반대면 축소다. 내부 레벨을 꺼내려고 제품 코드에 테스트용
    속성을 심는 것보다, 사용자가 실제로 보는 값으로 판정하는 편이 낫다.
  */
  const scaleMeters = async () => {
    const text = await page
      .locator("#__react-kakao-maps-sdk___Map div")
      .filter({ hasText: /^\d+m$/ })
      .first()
      .innerText();
    return Number(text.replace("m", ""));
  };
  const box = await mapBox(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  /*
    휠 한 번에 한 단계씩 움직인다. 카카오는 확대 애니메이션이 끝난 뒤에야 축척 막대를
    다시 그리므로, 굴릴 때마다 커서를 지도 위에 다시 두고 한 박자 기다렸다 읽는다.
  */
  const wheelStep = async (deltaY: number) => {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, deltaY);
    await page.waitForTimeout(800);
    return scaleMeters();
  };

  const start = await scaleMeters();
  // 아래로 굴리면 축소 — 축척 막대가 가리키는 거리가 멀어진다.
  expect(await wheelStep(120)).toBeGreaterThan(start);
  // 위로 굴리면 다시 확대되어 원래 자리로 돌아온다.
  expect(await wheelStep(-120)).toBe(start);

  /*
    끝까지 확대해 최소 배율에 붙인 뒤에도 다시 축소할 수 있어야 한다. 여기서 막히면
    사용자는 한번 크게 당긴 지도를 휠로는 되돌리지 못한다.
  */
  for (let i = 0; i < 5; i += 1) await wheelStep(-120);
  const atMinimum = await scaleMeters();
  expect(await wheelStep(120)).toBeGreaterThan(atMinimum);
});

test("확인 모달은 딤을 눌러도, Esc로도 닫힌다", async ({ page }) => {
  const saves = await mockBoothMap(page);
  await openEditor(page);

  // 무언가 바꿔야 저장 버튼이 열린다.
  const pin = await pinCenter(page, "굿즈샵");
  await drag(page, pin, { x: pin.x + 60, y: pin.y + 40 });

  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(20, 20);
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // 닫기만 했으므로 저장 요청은 나가지 않았다.
  expect(saves).toHaveLength(0);
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeEnabled();
});
