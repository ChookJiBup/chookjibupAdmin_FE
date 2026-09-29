import { redirect } from "next/navigation";

export default async function SubAdminDetailPage({
  params,
}: {
  params: Promise<{ festivalId: string; adminId: string }>;
}) {
  const { festivalId } = await params;
  redirect(`/console/festivals/${festivalId}/operators`);
}
