export interface UnsupportedStaffFeature {
  title: string;
  description: string;
}

export type StaffCongestionLevel = "LOW" | "MEDIUM" | "HIGH";

export interface UpdateBoothCongestionRequest {
  waitMinutes: number;
  congestionLevel: StaffCongestionLevel;
}

export interface BoothCongestionResponse {
  boothId: number;
  congestionLevel: StaffCongestionLevel;
  waitMinutes: number;
  createdAt: string;
}
