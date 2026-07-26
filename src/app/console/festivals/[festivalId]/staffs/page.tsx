import { StaffsPanel } from "@/features/staffs/StaffsPanel";

export default async function StaffManagePage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="heading-small">스태프 조회/등록/삭제 (관리자·운영자) — {festivalId}</h1>
      <StaffsPanel festivalId={festivalId} />
    </div>
  );
}
