/**
 * 이름을 화면에 보여 줄 때 가운데 글자를 `*`로 가린다.
 *
 * <p>표시 전용이다. 원본 값이나 API로 보내는 값은 절대 이 함수를 거치지 않는다.</p>
 *
 * <p>글자 수별 규칙:</p>
 * <ul>
 *   <li>0글자(빈 값·null·undefined·공백뿐) → 빈 문자열</li>
 *   <li>1글자 → 그대로. 한 글자를 `*`로 바꾸면 남는 정보가 하나도 없어 이름 칸이
 *       비어 보인다. 어차피 한 글자만으로는 개인을 특정하기 어려워 그대로 둔다.</li>
 *   <li>2글자(`김은`) → `김*`. 가운데가 없으니 뒷글자를 가린다.</li>
 *   <li>3글자(`김은지`) → `김*지`</li>
 *   <li>4글자 이상(`남궁은지`) → `남**지`. 첫 글자와 마지막 글자만 남기고 가운데를 전부 가린다.</li>
 * </ul>
 *
 * <p>공백이 섞인 이름(`John Smith`, `남궁 은지`)은 공백 위치를 그대로 두고 토막마다
 * 같은 규칙을 적용한다. 영문 이름은 성과 이름이 공백으로 나뉘므로 통째로 가리는 것보다
 * 이쪽이 읽기 좋다(`John Smith` → `J**n S***h`).</p>
 */
export function maskPersonName(name: string | null | undefined): string {
  if (!name || name.trim().length === 0) return "";
  // 공백(그리고 공백 개수)은 그대로 두고 공백 아닌 토막마다 따로 가린다.
  return name.replace(/\S+/g, (segment) => maskSegment(segment));
}

function maskSegment(segment: string): string {
  const characters = toCharacters(segment);
  if (characters.length <= 1) return segment;
  if (characters.length === 2) return `${characters[0]}*`;
  const last = characters[characters.length - 1];
  return `${characters[0]}${"*".repeat(characters.length - 2)}${last}`;
}

/**
 * 사람이 한 글자로 인식하는 단위로 쪼갠다.
 *
 * <p>`name[0]`처럼 문자열을 인덱싱하면 이모지 같은 서러게이트 페어가 반토막 나서
 * 깨진 글자(`\uD83D`)가 화면에 남는다. 결합 문자(ZWJ 이모지, 조합형 악센트)까지
 * 한 글자로 묶으려면 `Intl.Segmenter`가 필요하고, 없는 환경에서는 최소한
 * 코드포인트 단위로는 안전한 `Array.from`으로 물러선다.</p>
 */
function toCharacters(value: string): string[] {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (segment) => segment.segment);
  }
  return Array.from(value);
}
