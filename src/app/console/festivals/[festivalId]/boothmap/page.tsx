import { BoothMapUploadPanel } from "@/features/boothmap/BoothMapUploadPanel";

export default async function BoothMapEditPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">축제 부스맵 수정 (관리자) — {festivalId}</h1>
      <BoothMapUploadPanel />
    </div>
  );
}
