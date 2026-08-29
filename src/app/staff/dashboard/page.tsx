import { Suspense } from "react";
import { StaffAuthGuard } from "@/components/auth/StaffAuthGuard";
import { StaffMapPanel } from "@/features/staffMap/StaffMapPanel";

export default function StaffDashboardPage() {
  return (
    <StaffAuthGuard>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <p className="body-small text-zinc-500">지도를 준비하는 중...</p>
          </div>
        }
      >
        <StaffMapPanel />
      </Suspense>
    </StaffAuthGuard>
  );
}
