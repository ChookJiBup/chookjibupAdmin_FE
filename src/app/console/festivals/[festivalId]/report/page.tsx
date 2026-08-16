import { ReportFlow } from "@/features/report/ReportFlow";

export default async function OperationReportPage({
  params,
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  return <ReportFlow festivalId={festivalId} />;
}
