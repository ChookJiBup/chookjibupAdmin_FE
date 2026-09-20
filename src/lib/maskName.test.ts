import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskPersonName } from "./maskName";

describe("maskPersonName", () => {
  it("3글자 이름은 가운데 한 글자를 가린다", () => {
    assert.equal(maskPersonName("김은지"), "김*지");
    assert.equal(maskPersonName("이학준"), "이*준");
  });

  it("2글자 이름은 가운데가 없으므로 뒷글자를 가린다", () => {
    assert.equal(maskPersonName("김은"), "김*");
  });

  it("1글자 이름은 가릴 곳이 없어 그대로 둔다", () => {
    assert.equal(maskPersonName("김"), "김");
  });

  it("4글자 이상은 첫 글자와 마지막 글자만 남긴다", () => {
    assert.equal(maskPersonName("남궁은지"), "남**지");
    assert.equal(maskPersonName("독고은지현"), "독***현");
  });

  it("공백은 위치를 유지하고 토막마다 따로 가린다", () => {
    assert.equal(maskPersonName("John Smith"), "J**n S***h");
    assert.equal(maskPersonName("남궁 은지"), "남* 은*");
    // 앞뒤 공백도 그대로 둔다 — 이름 칸 정렬이 흔들리지 않게.
    assert.equal(maskPersonName(" 김은지 "), " 김*지 ");
  });

  it("빈 값·null·undefined·공백뿐인 값은 빈 문자열이 된다", () => {
    assert.equal(maskPersonName(""), "");
    assert.equal(maskPersonName(null), "");
    assert.equal(maskPersonName(undefined), "");
    assert.equal(maskPersonName("   "), "");
  });

  it("이모지가 섞여도 글자가 깨지지 않는다", () => {
    // 문자열 인덱싱으로 자르면 서러게이트 페어가 반토막 나 «�»가 남았다.
    assert.equal(maskPersonName("김😀지"), "김*지");
    assert.equal(maskPersonName("😀😀"), "😀*");
    assert.equal(maskPersonName("😀"), "😀");
  });

  it("결합 문자(ZWJ 이모지·조합형 악센트)도 한 글자로 센다", () => {
    // 👨‍👩‍👧는 ZWJ로 이어붙인 한 글자다. 코드포인트로 세면 5글자가 돼 버린다.
    assert.equal(maskPersonName("가👨‍👩‍👧나"), "가*나");
    // e + U+0301(결합 악센트) = é. 악센트가 떨어져 나가지 않고 마지막 글자로 남는다.
    assert.equal(maskPersonName("José"), "J**é");
  });
});
