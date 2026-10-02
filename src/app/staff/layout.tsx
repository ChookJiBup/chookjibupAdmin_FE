import { StaffHeader } from "@/components/layout/StaffHeader";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "./OfflineBanner";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[402px] flex-1 flex-col bg-white">
      <StaffHeader />
      <OfflineBanner />
      {/* 스태프 화면 기본 여백은 20이다. 지도처럼 꽉 채워야 하는 화면만 안에서 되돌린다. */}
      <div className="flex min-h-0 flex-1 flex-col p-5">{children}</div>
      {/* 작업 결과와 오류 알림은 모든 관리자 화면에서 우측 상단에 통일한다. */}
      <Toaster
        position="top-right"
        offset={{ top: "76px", right: "16px" }}
        mobileOffset={{ top: "68px", right: "12px" }}
      />
    </div>
  );
}
