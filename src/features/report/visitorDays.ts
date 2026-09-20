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
 * 이미 지나간 날 중 방문 인원이 비어 있는 날들.
 *
 * - 오늘은 아직 끝나지 않았으니 누락으로 치지 않는다(`visitDate < today`).
 * - `inputAllowed`가 false인 날은 백엔드가 아직 입력을 받지 않는다(일일마감 전).
 *   보내 봐야 거절당하므로 목록에 넣지 않는다.
 * - 집계 방식이 «총합»이거나 아직 정해지지 않은(UNSET) 축제는 일자별로 쌓는 값이
 *   아니므로 판정 대상에서 뺀다. UNSET인 축제에 일자별 값을 저장하면 백엔드가
 *   집계 방식을 DAILY로 잠가 버려, 묻지도 않고 축제 설정을 바꾸는 꼴이 된다.
 */
export function missingPastVisitorDays(
  counts: FestivalVisitorCounts | undefined,
  today: string = todayIsoDate(),
): FestivalVisitorDay[] {
  if (!counts || counts.visitorCountInputMode !== "DAILY") return [];
  return counts.days.filter(
    (day) => day.visitDate < today && day.inputAllowed && day.visitorCount === null,
  );
}
