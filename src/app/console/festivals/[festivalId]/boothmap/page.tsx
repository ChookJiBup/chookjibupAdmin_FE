import { BoothMapUploadPanel } from "@/features/boothmap/BoothMapUploadPanel";

export default async function BoothMapEditPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <div className="col-span-3 flex flex-col gap-4">
      <h1 className="heading-small">축제 부스맵 수정 (관리자) — {festivalId}</h1>
      <BoothMapUploadPanel key={festivalId} festivalId={festivalId} />
    </div>
  );
}
