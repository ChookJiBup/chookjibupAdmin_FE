export type AdminRole = "FESTIVAL_OWNER" | "SUB_ADMIN";

export interface AdminSummary {
  adminId: string;
  /** 축제 생성 전에는 null */
  festivalId: string | null;
  email: string;
  name: string;
  /** 과·팀 (예: 토목과) */
  organization: string;
  /** 직급 (예: 과장) */
  rank: string;
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
  tokenType: string;
  expiresIn: number;
  admin: AdminSummary;
}

export type AdminStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface AdminEmailVerificationRequest {
  email: string;
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

export interface AdminSignupResponse {
  adminId: string;
  festivalId: string | null;
  email: string;
  name: string;
  organization: string;
  role: AdminRole | null;
  status: AdminStatus;
}

export interface AdminAccountProfile {
  adminId: string;
  email: string;
  name: string;
  organization: string;
  rank: string;
  status: AdminStatus;
}

export interface AdminPasswordResetConfirmRequest {
  token: string;
  password: string;
  passwordConfirm: string;
}
