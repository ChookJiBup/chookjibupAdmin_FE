export type AdminRole = "FESTIVAL_OWNER" | "SUB_ADMIN";

export interface AdminSummary {
  adminId: string;
  /** 축제 생성 전에는 null */
  festivalId: string | null;
  email: string;
  name: string;
  organization: string;
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
