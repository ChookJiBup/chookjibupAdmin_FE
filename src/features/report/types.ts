export interface FestivalReportSummary {
  festivalId: string;
  dataAvailable: boolean;
  totalVisitorCount: number;
  peakConcurrentVisitorCount: number;
  averageWaitMinutes: number;
  generatedAt: string | null;
}
