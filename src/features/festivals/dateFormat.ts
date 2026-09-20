/**
 * 화면에 보여 주고 입력받는 날짜 형식. 구분자는 하이픈으로 통일한다.
 *
 * <p>예전에는 `2026.09.20`처럼 마침표로 적었고, 브라우저 기본 로케일을 쓰는 자리에서는
 * `2026. 9. 20.`까지 섞여 나왔다. 화면마다 형식이 달라 보이는 걸 막으려고
 * 입력·표시 모두 `yyyy-MM-dd` 하나로 맞췄다.</p>
 */
export const DATE_DISPLAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 입력칸 placeholder와 오류 문구에서 같이 쓰는 형식 이름. */
export const DATE_FORMAT_LABEL = "yyyy-MM-dd";

/**
 * 어떤 구분자로 적힌 날짜든 `yyyy-MM-dd`로 맞춘다.
 *
 * <p>마침표·슬래시로 적힌 옛 값(`2026.09.20`)과 0을 안 채운 값(`2026-9-5`)이
 * 저장돼 있거나 외부에서 들어올 수 있어, 표시 직전에 한 번 더 정규화한다.
 * 날짜로 읽히지 않으면 원문을 그대로 돌려준다 — 임의로 고쳐 쓰는 것보다
 * 이상한 값이 그대로 보이는 편이 원인을 찾기 쉽다.</p>
 */
export function normalizeDisplayDate(value: string) {
  const match = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(value.trim());
  if (!match) return value;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** 서버가 준 "yyyy-MM-dd"를 화면 표기로 바꾼다. */
export function toDisplayDate(isoDate: string) {
  return normalizeDisplayDate(isoDate);
}

/** 화면 표기를 API가 요구하는 "yyyy-MM-dd"로 바꾼다. */
export function toIsoDate(displayDate: string) {
  return normalizeDisplayDate(displayDate);
}

/**
 * 서버가 준 날짜(또는 날짜+시각) 문자열에서 달력 날짜만 "yyyy-MM-dd"로 뽑는다.
 *
 * <p>백엔드는 `LocalDateTime`을 타임존 없이 내려준다(`2026-09-20T23:59:59.999`).
 * 이걸 `new Date()`에 넣어 UTC로 읽으면 한국 시간으로는 다음 날 08:59가 되어
 * **날짜가 하루 밀린다.** 스태프 계정 유효 기간의 종료일(`LocalTime.MAX`)이 정확히
 * 이 함정에 걸린다. 여기서 뜻하는 값은 "그 지역의 달력 날짜"라 시간대 변환이
 * 아예 필요 없으므로, Date를 거치지 않고 문자열 앞부분만 잘라 쓴다.</p>
 */
export function toCalendarDate(value: string) {
  const datePart = value.trim().split("T")[0];
  const normalized = normalizeDisplayDate(datePart);
  return DATE_DISPLAY_PATTERN.test(normalized) ? normalized : value;
}

/** 로컬 달력 기준 Date를 "yyyy-MM-dd"로 적는다. UTC로 읽지 않으므로 날짜가 밀리지 않는다. */
export function toIsoDateString(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 오늘부터 축제 시작일까지 남은 일수. 자정 기준 캘린더 일수 차이로 계산한다. */
export function calculateDday(isoStartDate: string) {
  const [year, month, day] = isoStartDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** 남은 일수를 "D-3" / "D-DAY" / "D+2" 표기로 변환한다. */
export function formatDday(isoStartDate: string) {
  const dday = calculateDday(isoStartDate);
  if (dday === 0) return "D-DAY";
  return dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
}

/**
 * 숫자만 입력받아 "yyyy-MM-dd" 형태로 자동 포맷팅한다.
 *
 * <p>직접 타이핑하는 경로와 (나중에 달력 위젯이 붙더라도) 날짜를 문자열로 바꾸는 경로가
 * 같은 형식을 쓰게 하려고, 입력칸에 들어가는 값은 반드시 이 함수를 거친다.</p>
 */
export function formatDateInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join("-");
}

/**
 * 달력에 실제로 있는 날짜인지 확인한다.
 *
 * <p>형식만 보면 `2026-13-45`도 통과해 등록 확인 모달까지 넘어갔다. 월·일 범위와
 * 윤년까지 보려면 실제 Date로 되돌려 같은 날인지 비교하는 편이 확실하다.</p>
 */
export function isRealDate(displayDate: string) {
  if (!DATE_DISPLAY_PATTERN.test(displayDate)) return false;
  const [year, month, day] = displayDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** 축제 기간 입력칸별 오류 문구. 값이 null이면 그 칸은 문제가 없다는 뜻이다. */
export interface FestivalPeriodErrors {
  startDate: string | null;
  endDate: string | null;
}

const DATE_FORMAT_ERROR = `날짜는 ${DATE_FORMAT_LABEL} 형식의 실제 날짜로 입력해 주세요.`;
const PERIOD_REVERSED_ERROR = "종료날짜는 시작날짜보다 빠를 수 없습니다.";

/**
 * 축제 기간(시작날짜·종료날짜) 검증.
 *
 * <p>기간 역전은 어느 칸을 고쳐도 같은 판정이라 규칙을 하나만 두고, 문구는 뒤쪽 값인
 * 종료날짜 칸에 붙인다. 하루짜리 축제가 있으므로 시작날짜 == 종료날짜는 통과다.</p>
 */
export function validateFestivalPeriod(startDate: string, endDate: string): FestivalPeriodErrors {
  const errors: FestivalPeriodErrors = { startDate: null, endDate: null };

  if (startDate.trim().length === 0) errors.startDate = "시작날짜를 입력해 주세요.";
  else if (!isRealDate(startDate)) errors.startDate = DATE_FORMAT_ERROR;

  if (endDate.trim().length === 0) errors.endDate = "종료날짜를 입력해 주세요.";
  else if (!isRealDate(endDate)) errors.endDate = DATE_FORMAT_ERROR;

  if (!errors.startDate && !errors.endDate && startDate > endDate) {
    errors.endDate = PERIOD_REVERSED_ERROR;
  }
  return errors;
}

/** 축제 기간에 오류가 하나라도 있는지. */
export function hasFestivalPeriodError(errors: FestivalPeriodErrors) {
  return errors.startDate !== null || errors.endDate !== null;
}
