import { FestivalOwnerGuard } from "@/components/auth/FestivalOwnerGuard";
import { OperatorsPanel } from "@/features/operators/OperatorsPanel";

export default async function OperatorManagePage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return (
    <FestivalOwnerGuard festivalId={festivalId}>
      <OperatorsPanel festivalId={festivalId} />
    </FestivalOwnerGuard>
  );
}
