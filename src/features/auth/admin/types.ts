export type AdminRole = "FESTIVAL_OWNER" | "SUB_ADMIN";

export type AccountKind = "GOVERNMENT" | "CONTRACTOR";

/** 축제 개설은 공무원 계정만 가능하다. 초대된 외부업자는 제2관리자와 같다. */
export function canCreateFestival(accountKind: AccountKind | null | undefined): boolean {
  return accountKind !== "CONTRACTOR";
}

export interface AdminSummary {
  adminId: string;
  /** 축제 생성 전에는 null */
  festivalId: string | null;
  email: string;
  name: string;
  /** 과·팀 또는 외부업자 업체명 */
  organization: string;
  /** 직급. 외부업자는 null. 기존 세션에는 없을 수 있다. */
  rank?: string | null;
  /** 기존 세션에는 없을 수 있다. 없으면 공무원으로 취급한다. */
  accountKind?: AccountKind;
  /** 축제 생성 전에는 null */
  role: AdminRole | null;
  canInviteSubAdmin: boolean;
  canModifyFestivalInfo: boolean;
  canViewOperationReport: boolean;
  canUpdateQueueTail: boolean;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  tokenType?: string;
  expiresIn: number;
  admin: AdminSummary;
}

export type AdminStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface AdminEmailVerificationRequest {
  email: string;
  accountKind: AccountKind;
}

export interface AdminEmailVerificationConfirmRequest {
  email: string;
  /** 6자리 숫자 코드 */
  code: string;
}

export interface AdminSignupRequest {
  email: string;
  name: string;
  organization: string;
  rank: string;
  password: string;
  passwordConfirm: string;
}

export interface AdminContractorSignupRequest {
  email: string;
  name: string;
  companyName: string;
  password: string;
  passwordConfirm: string;
}

export interface AdminSignupResponse {
  adminId: string;
  festivalId: string | null;
  email: string;
  name: string;
  organization: string;
  rank: string | null;
  accountKind: AccountKind;
  role: AdminRole | null;
  status: AdminStatus;
}

export interface AdminAccountProfile {
  adminId: string;
  email: string;
  name: string;
  organization: string;
  rank: string | null;
  accountKind: AccountKind;
  status: AdminStatus;
}

export interface AdminPasswordResetConfirmRequest {
  token: string;
  password: string;
  passwordConfirm: string;
}
