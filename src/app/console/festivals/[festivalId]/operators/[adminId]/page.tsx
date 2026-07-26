import Link from "next/link";
import { SubAdminDetailPanel } from "@/features/operators/SubAdminDetailPanel";

export default async function SubAdminDetailPage({
  params,
}: {
  params: Promise<{ festivalId: string; adminId: string }>;
}) {
  const { festivalId, adminId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">운영자 상세 조회 (관리자)</h1>
        <Link href={`/console/festivals/${festivalId}/operators`} className="body-small underline">
          목록으로
        </Link>
      </div>
      <SubAdminDetailPanel festivalId={festivalId} adminId={adminId} />
    </div>
  );
}
