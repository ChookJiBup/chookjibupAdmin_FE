export type AdminStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface SubAdmin {
  adminId: string;
  email: string;
  name: string;
  organization: string;
  status: AdminStatus;
}

export interface RegisterOperatorRequest {
  email: string;
  name: string;
  companyName: string;
}

export interface RegisterOperatorResult {
  adminId: string;
  email: string;
  name: string;
  companyName: string;
  created: boolean;
  temporaryPassword: string | null;
}
