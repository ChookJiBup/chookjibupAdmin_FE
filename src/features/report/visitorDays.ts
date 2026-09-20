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
 * 이미 하루가 끝난 일차들. 비어 있든 이미 채웠든 모두 돌려준다.
 *
 * - 「하루가 끝났다」 = `visitDate < 오늘`. 백엔드도 같은 규칙이다 — 일자별 저장 API는
 *   오늘 이후 날짜를 거절하고(`!visitDate.isBefore(today)` → 400), 조회 응답의
 *   `inputAllowed`도 `visitDate < today`를 그대로 실어 보낸다. 그래서 그날 당일에는
 *   묻지 않고, 하루가 끝난 «다음 날» 들어왔을 때 비로소 대상이 된다.
 * - 두 조건을 모두 보는 이유는 사용자 기기 시계와 서버 시계가 어긋날 수 있어서다.
 *   어느 한쪽이라도 아직 안 끝났다고 보면 묻지 않는다.
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
  return counts.days.filter((day) => day.visitDate < today && day.inputAllowed);
}

/**
 * 하루가 끝난 일차 중 아직 방문 인원이 비어 있는 날들.
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
