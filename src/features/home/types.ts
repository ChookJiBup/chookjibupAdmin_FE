import type { AdminRole } from "@/features/auth/admin/types";

export type FestivalProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export interface FestivalSummary {
  festivalId: string;
  festivalName: string;
  festivalYear: number;
  /** 이 축제에서 로그인한 관리자의 역할 */
  role: AdminRole;
  festivalStatus: "DRAFT" | "PUBLISHED" | "CANCELLED";
  progressStatus: FestivalProgressStatus;
  address: string;
  detailAddress: string;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
}
