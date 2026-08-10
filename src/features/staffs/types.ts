export type FieldStaffStatus = "ACTIVE" | "DELETED";

export interface FieldStaff {
  staffId: string;
  loginId: string;
  name: string;
  phoneNumber: string;
  validFrom: string;
  validUntil: string;
  status: FieldStaffStatus;
}

export interface CreateFieldStaffRequest {
  loginId: string;
  name: string;
  phoneNumber: string;
}

export interface CreateFieldStaffResult {
  staffId: string;
  loginId: string;
  name: string;
  phoneNumber: string;
  validFrom: string;
  validUntil: string;
  /** 최초 로그인용 임시 비밀번호 — 생성 응답에서만 내려온다. 이후에는 다시 조회할 수 없다. */
  temporaryPassword: string;
}

export interface UpdateFieldStaffRequest {
  name: string;
  phoneNumber: string;
}

export interface ReissueFieldStaffPasswordResponse {
  temporaryPassword: string;
}
