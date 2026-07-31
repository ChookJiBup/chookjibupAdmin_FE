import { OperatorsPanel } from "@/features/operators/OperatorsPanel";

export default async function OperatorManagePage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <OperatorsPanel festivalId={festivalId} />;
}
