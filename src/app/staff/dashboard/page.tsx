import { StaffAuthGuard } from "@/components/auth/StaffAuthGuard";
import { StaffLogoutButton } from "@/components/auth/StaffLogoutButton";
import { StaffBadge } from "@/components/ui/RoleBadge";
import { StaffDashboardPanel } from "@/features/staffDashboard/StaffDashboardPanel";

export default function StaffDashboardPage() {
  return (
    <StaffAuthGuard>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h1 className="heading-small">실시간 혼잡도 / 줄끝라인 수정</h1>
            <StaffBadge />
          </div>
          <StaffLogoutButton />
        </div>
        <p className="body-small text-zinc-500">
          축제부스맵을 통해 실시간 혼잡도를 확인하고, 각 부스별 줄 끝 라인 위치를 수정합니다.
        </p>
        <StaffDashboardPanel />
      </div>
    </StaffAuthGuard>
  );
}
