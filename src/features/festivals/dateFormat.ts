export const DATE_DISPLAY_PATTERN = /^\d{4}\.\d{2}\.\d{2}$/;

/** "yyyy-MM-dd"를 화면 표기 "YYYY.mm.dd"로 변환한다. */
export function toDisplayDate(isoDate: string) {
  return isoDate.replaceAll("-", ".");
}

/** "YYYY.mm.dd" 화면 표기를 API가 요구하는 "yyyy-MM-dd"로 변환한다. */
export function toIsoDate(displayDate: string) {
  return displayDate.replaceAll(".", "-");
}

/** 숫자만 입력받아 "YYYY.mm.dd" 형태로 자동 포맷팅한다. */
export function formatDateInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join(".");
}
