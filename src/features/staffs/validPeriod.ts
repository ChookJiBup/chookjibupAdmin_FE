import { toCalendarDate } from "@/features/festivals/dateFormat";

/**
 * 스태프 계정 유효 기간 표기. 값이 날짜로 읽히지 않으면 원문을 그대로 보여준다.
 *
 * <p>예전에는 `new Date(value).toLocaleDateString("ko-KR")`로 찍어 `2026. 9. 13.`처럼
 * 마침표와 들쑥날쑥한 자릿수로 보였다. 화면 전체를 `yyyy-MM-dd`로 맞추면서 바꿨다.</p>
 *
 * <p>Date를 거치지 않는 이유가 하나 더 있다. 백엔드는 유효 종료일을
 * `LocalDateTime.of(endDate, LocalTime.MAX)` — 즉 `2026-09-20T23:59:59.999...` 로
 * 내려주는데, 타임존 없는 이 문자열을 UTC로 읽으면 한국 시간으로는 다음 날 08:59가 되어
 * **유효 기간이 하루 늘어난 것처럼 보인다.** 여기서 보여 줄 값은 «그 지역의 달력 날짜»라
 * 시간대 변환이 필요 없으므로 문자열에서 날짜 부분만 잘라 쓴다.</p>
 */
export function formatStaffDate(value: string): string {
  return toCalendarDate(value);
}

/**
 * 스태프 계정이 로그인할 수 있는 기간 안내 문구.
 *
 * 계정을 만들어도 축제 시작 7일 전이 되기 전에는 로그인할 수 없어서, 생성 직후
 * 임시 비밀번호만 전달하면 "비밀번호가 틀렸다"는 문의로 돌아온다.
 */
export function staffLoginPeriodNotice(validFrom: string, validUntil: string): string {
  return `로그인 가능 기간: ${formatStaffDate(validFrom)} ~ ${formatStaffDate(validUntil)} (축제 시작 7일 전부터 로그인할 수 있습니다)`;
}
