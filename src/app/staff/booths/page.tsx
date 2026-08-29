import { StaffAuthGuard } from "@/components/auth/StaffAuthGuard";
import { BoothSearchPanel } from "@/features/staffMap/BoothSearchPanel";

export default function StaffBoothSearchPage() {
  return (
    <StaffAuthGuard>
      <BoothSearchPanel />
    </StaffAuthGuard>
  );
}
