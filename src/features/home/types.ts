import type { AdminRole } from "@/features/auth/admin/types";

export type FestivalProgressStatus = "UPCOMING" | "ONGOING" | "COMPLETED";

export interface FestivalSummary {
  festivalId: string;
  name: string;
  /** 이 축제에서 로그인한 관리자의 역할 */
  role: AdminRole;
  status: FestivalProgressStatus;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd */
  endDate: string;
  /** 진행 예정 상태에서만 노출되는 D-day 문구 (예: "D-88") */
  dDayLabel?: string;
}
