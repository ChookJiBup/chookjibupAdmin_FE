import { StaffAuthGuard } from "@/components/auth/StaffAuthGuard";
import { StaffLogoutButton } from "@/components/auth/StaffLogoutButton";
import { StaffBadge } from "@/components/ui/RoleBadge";
import { StaffDashboardPanel } from "@/features/staffDashboard/StaffDashboardPanel";

export default function StaffDashboardPage() {
  return (
    <StaffAuthGuard>
      <main className="flex flex-col gap-4">
        <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
          <div className="flex items-center gap-2">
            <h1 className="heading-small">현장 스태프</h1>
            <StaffBadge />
          </div>
          <StaffLogoutButton />
        </div>
        <p className="body-small text-zinc-500">
          담당 축제 정보와 사용할 수 있는 현장 운영 기능을 확인합니다.
        </p>
        <StaffDashboardPanel />
      </main>
    </StaffAuthGuard>
  );
}
