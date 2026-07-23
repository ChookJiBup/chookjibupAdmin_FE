import { StaffAuthGuard } from "@/components/auth/StaffAuthGuard";
import { StaffLogoutButton } from "@/components/auth/StaffLogoutButton";

export default function StaffDashboardPage() {
  return (
    <StaffAuthGuard>
      <div className="flex items-start justify-between">
        <h1 className="text-lg font-semibold">실시간 혼잡도 / 줄끝라인 수정 (스태프)</h1>
        <StaffLogoutButton />
      </div>
      <p className="text-sm text-gray-500">
        축제부스맵을 통해 실시간 혼잡도를 확인하고, 각 부스별 줄 끝 라인 위치를 수정합니다.
      </p>
    </StaffAuthGuard>
  );
}
