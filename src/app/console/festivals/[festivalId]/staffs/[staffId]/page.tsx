import Link from "next/link";
import { FieldStaffDetailPanel } from "@/features/staffs/FieldStaffDetailPanel";

export default async function FieldStaffDetailPage({
  params,
}: {
  params: Promise<{ festivalId: string; staffId: string }>;
}) {
  const { festivalId, staffId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="heading-small">현장 스태프 상세 조회 (관리자)</h1>
        <Link href={`/console/festivals/${festivalId}/staffs`} className="body-small underline">
          목록으로
        </Link>
      </div>
      <FieldStaffDetailPanel festivalId={festivalId} staffId={staffId} />
    </div>
  );
}
