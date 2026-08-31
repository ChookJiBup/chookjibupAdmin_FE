export interface StaffLoginRequest {
  festivalId: string;
  loginId: string;
  password: string;
}

export interface StaffLoginResponse {
  accessToken?: string;
  tokenType?: string;
  expiresIn: number;
  staffId: string;
  festivalId: string;
  loginId: string;
  name: string;
}

export interface StaffSession {
  staffId: string;
  festivalId: string;
  loginId: string;
  name: string;
}
