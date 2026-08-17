export type AdminStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface SubAdmin {
  adminId: string;

  email: string;

  name: string;

  /** 과·팀 */

  organization: string;

  rank: string;

  status: AdminStatus;
}

/** 아직 이 축제에 배정되지 않은, 초대 후보로 검색된 관리자 계정 */

export type SubAdminCandidate = SubAdmin;
