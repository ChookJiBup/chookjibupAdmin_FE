import { BoothMapUploadPanel } from "@/features/boothmap/BoothMapUploadPanel";

export default async function BoothMapEditPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <BoothMapUploadPanel key={festivalId} festivalId={festivalId} />;
}
