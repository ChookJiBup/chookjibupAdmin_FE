import { StaffsPanel } from "@/features/staffs/StaffsPanel";

export default async function StaffManagePage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <StaffsPanel festivalId={festivalId} />;
}
