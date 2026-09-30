import type { FestivalVisitorCounts, FestivalVisitorDay } from "./types";

/**
 * 로컬 달력 기준 오늘 날짜를 "yyyy-MM-dd"로 만든다.
 *
 * 백엔드의 `visitDate`는 시각이 없는 «그 지역의 달력 날짜»라
 * `parseServerDateTime`(시각 문자열을 UTC로 못박는 함수)을 쓰면 오히려 하루가 밀린다.
 * 그래서 시간대 변환 없이 문자열끼리 비교하고, 오늘 날짜도 로컬 달력에서 만든다.
 */
export function todayIsoDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 축제 시작일부터 오늘까지의 일차들. 비어 있든 이미 채웠든 모두 돌려준다.
 *
 * - 보고서는 오늘의 운영 현황까지 반영하므로 `visitDate <= 오늘`을 입력 대상으로 본다.
 * - 사용자 기기와 서버 날짜가 어긋나 미래 일차가 열리지 않도록 서버의
 *   `inputAllowed`도 함께 확인한다.
 * - 집계 방식이 «총합»인 축제는 일자별로 쌓는 값이 아니므로 제외한다. 아직 정해지지
 *   않은(UNSET) 축제는 포함한다 — 첫 일차를 여기서 받는 순간 백엔드가 DAILY로
 *   잠그는데, 그게 축제 기간 중 매일 받는다는 이 화면의 전제와 같다. UNSET을 빼면
 *   진행 중 축제에서는 이 물음이 영영 뜨지 않는다(한 번도 입력된 적이 없으므로).
 */
export function elapsedVisitorDays(
  counts: FestivalVisitorCounts | undefined,
  today: string = todayIsoDate(),
): FestivalVisitorDay[] {
  if (!counts || counts.visitorCountInputMode === "TOTAL") return [];
  return counts.days.filter((day) => day.visitDate <= today && day.inputAllowed);
}

/**
 * 오늘까지의 일차 중 아직 방문 인원이 비어 있는 날들.
 *
 * 모달을 띄울지 말지를 이 값으로 정한다. 모달에 보여 줄 목록은
 * `elapsedVisitorDays`(지나간 일차 전부)라 다르다 — 이미 채운 날도 함께 보여 주고
 * 고칠 수 있어야 하기 때문이다.
 */
export function missingPastVisitorDays(
  counts: FestivalVisitorCounts | undefined,
  today: string = todayIsoDate(),
): FestivalVisitorDay[] {
  return elapsedVisitorDays(counts, today).filter((day) => day.visitorCount === null);
}
