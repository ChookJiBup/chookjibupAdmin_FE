export type PolicySlug = "terms" | "privacy" | "privacy-outsourcing";

export interface PolicyContent {
  title: string;
  body: string;
}

/** 실제 법무 검토된 약관 문구가 아직 없어, 화면 확인용 목업 텍스트를 둔다. */
export const POLICY_CONTENT: Record<PolicySlug, PolicyContent> = {
  terms: {
    title: "축지법 서비스 이용약관",
    body: "제1조 (목적)\n이 약관은 축지법 서비스의 이용 조건 및 절차, 회원과 서비스 제공자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.\n\n※ 실제 약관 문구는 추후 법무 검토 후 반영 예정입니다.",
  },
  privacy: {
    title: "개인정보 수집 및 이용동의",
    body: "1. 수집 항목: 이메일, 이름, 과·팀, 직급\n2. 수집 목적: 관리자 계정 생성 및 서비스 이용\n3. 보유 기간: 회원 탈퇴 시까지\n\n※ 실제 약관 문구는 추후 법무 검토 후 반영 예정입니다.",
  },
  "privacy-outsourcing": {
    title: "개인정보 취급 위탁 동의",
    body: "회사는 서비스 운영을 위해 아래와 같이 개인정보 처리업무를 위탁하고 있습니다.\n\n(수탁업체 목록은 추후 확정 예정)\n\n※ 실제 약관 문구는 추후 법무 검토 후 반영 예정입니다.",
  },
};
