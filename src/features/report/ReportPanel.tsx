"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { cn } from "@/lib/utils";
import { AllReviewsDialog } from "./AllReviewsDialog";
import { getFestivalReportEvaluation, getFestivalReportPerformance } from "./api";
import { BoothCongestionShareChart } from "./charts/BoothCongestionShareChart";
import { RatingDistributionChart } from "./charts/RatingDistributionChart";
import { ZoneWaitRankingChart } from "./charts/ZoneWaitRankingChart";
import { ReportBreadcrumb, type ReportSection } from "./ReportBreadcrumb";
import { ReviewCard } from "./ReviewCard";
import type {
  FestivalReportEvaluation,
  FestivalReportPerformance,
  FestivalReportTextSummary,
} from "./types";

function SummaryCard({
  label,
  value,
  unit,
  helper,
  helperTone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  helper?: string;
  helperTone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-300 bg-white p-5">
      <p className="body-regular-bold text-zinc-950">{label}</p>
      <div>
        <p className="flex items-baseline gap-1">
          <span className="heading-small text-zinc-950">{value}</span>
          {unit ? <span className="body-regular text-zinc-950">{unit}</span> : null}
        </p>
        {helper ? (
          <p
            className={cn(
              "mt-1 body-caption",
              helperTone === "up" && "text-secondary-600",
              helperTone === "down" && "text-red-600",
              helperTone === "neutral" && "text-zinc-500",
            )}
          >
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border border-zinc-300 bg-white p-5", className)}>
      {title ? (
        <div className="flex min-h-[29px] items-center justify-between gap-3">
          <h2 className="body-regular-bold text-zinc-950">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={title ? "mt-5" : undefined}>{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white px-6 py-12 text-center">
      <p className="body-regular text-zinc-500">{message}</p>
    </div>
  );
}

function VisitorTrend({ data }: { data: FestivalReportPerformance["metrics"]["dailyTrend"] }) {
  if (!data.length) return <p className="body-small text-zinc-400">방문 추이 데이터가 없습니다.</p>;
  const maximum = Math.max(
    1,
    ...data.flatMap((item) => [item.currentCount ?? 0, item.previousCount ?? 0]),
  );
  const points = (key: "currentCount" | "previousCount") =>
    data
      .map(
        (item, index) =>
          `${data.length === 1 ? 50 : (index * 100) / (data.length - 1)},${110 - ((item[key] ?? 0) / maximum) * 90}`,
      )
      .join(" ");
  return (
    <div>
      <svg
        viewBox="0 0 100 120"
        className="h-52 w-full"
        preserveAspectRatio="none"
        aria-label="일자별 방문객 추이 차트"
      >
        {[20, 50, 80, 110].map((y) => (
          <line
            key={y}
            x1="0"
            x2="100"
            y1={y}
            y2={y}
            stroke="var(--color-zinc-200)"
            strokeWidth="0.5"
          />
        ))}
        <polyline
          points={points("previousCount")}
          fill="none"
          stroke="var(--color-zinc-400)"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        <polyline
          points={points("currentCount")}
          fill="none"
          stroke="var(--color-primary-600)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="flex justify-between body-caption text-zinc-500">
        {data.map((item) => (
          <span key={item.visitDate}>{item.dayIndex}일차</span>
        ))}
      </div>
      <div className="mt-4 flex gap-5 body-caption text-zinc-500">
        <span>━ 올해</span>
        <span>┄ 전년도</span>
      </div>
    </div>
  );
}

function PeakHours({ hours }: { hours: string[] }) {
  if (!hours.length)
    return <p className="body-small text-zinc-400">주요 방문 시간대 데이터가 없습니다.</p>;

  return (
    <ul className="flex flex-wrap gap-2">
      {hours.map((hour) => (
        <li
          key={hour}
          className="rounded-full bg-primary-50 px-3 py-1.5 body-small-bold text-primary-700"
        >
          {hour}
        </li>
      ))}
    </ul>
  );
}

function ReportHeadline({
  before,
  highlight,
  after,
  tone,
}: {
  before: string;
  highlight?: string;
  after?: string;
  tone: "up" | "down" | "neutral";
}) {
  return (
    <h1 className="heading-large text-zinc-950">
      {before}
      {highlight ? (
        <span
          className={cn(
            tone === "up" && "text-secondary-600",
            tone === "down" && "text-red-600",
            tone === "neutral" && "text-zinc-950",
          )}
        >
          {highlight}
        </span>
      ) : null}
      {after}
    </h1>
  );
}

function PreviousReportLink({
  previousFestivalId,
  festivalName,
  festivalYear,
}: {
  previousFestivalId: string;
  festivalName: string;
  festivalYear: number;
}) {
  return (
    <Link
      href={`/console/festivals/${previousFestivalId}/report`}
      className="flex items-center justify-between gap-4 rounded-lg border border-zinc-300 bg-white p-5 transition-colors hover:bg-zinc-50"
    >
      <span className="flex flex-col gap-1">
        <span className="body-regular-bold text-zinc-950">지난 리포트 보기</span>
        <span className="body-small text-zinc-500">
          {festivalYear - 1} {festivalName}
        </span>
      </span>
      <ChevronRightIcon className="size-5 shrink-0 text-zinc-500" />
    </Link>
  );
}

function PerformanceView({
  report,
  previousFestivalId,
}: {
  report: FestivalReportPerformance;
  previousFestivalId: string | null;
}) {
  if (!report.performanceAvailable)
    return <EmptyState message="아직 제공할 수 있는 축제 성과 데이터가 없습니다." />;
  const { metrics } = report;
  const visitors = metrics.totalVisitors;
  const tone =
    visitors.direction === "DOWN" ? "down" : visitors.direction === "UP" ? "up" : "neutral";
  const directionLabel =
    visitors.direction === "DOWN" ? "감소" : visitors.direction === "FLAT" ? "변동 없음" : "증가";
  const economic = metrics.economicEffect;
  const efficiency = metrics.operationEfficiency;
  const congestionShares = metrics.boothCongestionShare.reduce(
    (shares, item) => {
      if (
        item.congestionLevel === "LOW" ||
        item.congestionLevel === "MEDIUM" ||
        item.congestionLevel === "HIGH"
      ) {
        shares[item.congestionLevel] = item.sharePercent;
      }
      return shares;
    },
    { LOW: 0, MEDIUM: 0, HIGH: 0 },
  );
  const congestionRows = metrics.boothCongestionShare.length
    ? [{ boothName: "전체 부스", shares: congestionShares }]
    : [];

  return (
    <>
      {visitors.changeRatePercent === null ? (
        <ReportHeadline before={`${metrics.festivalName}의 성과를 확인해 보세요.`} tone="neutral" />
      ) : (
        <ReportHeadline
          before="이번 축제, 지난 축제보다 방문객이 "
          highlight={`${Math.abs(visitors.changeRatePercent).toLocaleString()}%`}
          after={` ${directionLabel}${visitors.direction === "FLAT" ? "입니다" : "했습니다"}`}
          tone={tone}
        />
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="총 관광객수"
          value={visitors.current.toLocaleString()}
          unit="명"
          helper={
            visitors.previous === null
              ? "비교할 이전 축제 데이터가 없습니다."
              : `전년대비 ${Math.abs(visitors.delta ?? 0).toLocaleString()}명 ${directionLabel}`
          }
          helperTone={visitors.previous === null ? "neutral" : tone}
        />
        <SummaryCard
          label="경제효과"
          value={
            economic.available && economic.totalMillionKrw !== null
              ? economic.totalMillionKrw.toLocaleString()
              : "데이터 미제공"
          }
          unit={economic.available && economic.totalMillionKrw !== null ? "백만원" : undefined}
          helper={
            economic.available &&
            economic.previousMillionKrw !== null &&
            economic.totalMillionKrw !== null
              ? `전년대비 ${Math.abs(economic.totalMillionKrw - economic.previousMillionKrw).toLocaleString()}백만원 ${
                  economic.totalMillionKrw >= economic.previousMillionKrw ? "증가" : "감소"
                }`
              : undefined
          }
          helperTone={
            economic.available &&
            economic.previousMillionKrw !== null &&
            economic.totalMillionKrw !== null
              ? economic.totalMillionKrw >= economic.previousMillionKrw
                ? "up"
                : "down"
              : "neutral"
          }
        />
        <SummaryCard
          label="운영효율(평균 대기시간)"
          value={
            efficiency.available && efficiency.averageWaitMinutes !== null
              ? efficiency.averageWaitMinutes.toLocaleString()
              : "데이터 미제공"
          }
          unit={efficiency.available && efficiency.averageWaitMinutes !== null ? "분" : undefined}
          helper={
            efficiency.available
              ? `참여부스 ${efficiency.boothCount.toLocaleString()}개`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="일자별 관광객 추이" className="lg:col-span-2">
          <VisitorTrend data={metrics.dailyTrend} />
        </Panel>
        <Panel title="주요 방문 시간대">
          <PeakHours hours={metrics.visitPattern.available ? metrics.visitPattern.peakHours : []} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="구역별 혼잡도 랭킹">
          <ZoneWaitRankingChart ranking={metrics.zoneWaitRanking} />
        </Panel>
        <Panel title="혼잡도 등급별 부스 비율" className="lg:col-span-2">
          <BoothCongestionShareChart rows={congestionRows} />
        </Panel>
      </div>

      <TextSummary summary={report.ai.performanceSummary} />

      {previousFestivalId ? (
        <PreviousReportLink
          previousFestivalId={previousFestivalId}
          festivalName={metrics.festivalName}
          festivalYear={metrics.festivalYear}
        />
      ) : null}
    </>
  );
}

function TextSummary({ summary }: { summary: FestivalReportTextSummary }) {
  const groups = [
    { title: "잘한 점", items: summary.positives },
    { title: "아쉬운 점", items: summary.issues },
    { title: "개선 제안", items: summary.improvements },
  ];
  if (groups.every(({ items }) => items.length === 0)) return null;
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map(({ title, items }) => (
        <Panel key={title} title={title}>
          {items.length ? (
            <ul className="flex list-disc flex-col gap-2 pl-4 body-small text-zinc-600">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="body-small text-zinc-400">분석 내용이 없습니다.</p>
          )}
        </Panel>
      ))}
    </div>
  );
}

const SENTIMENT_HEADLINE: Record<string, { highlight: string; tone: "up" | "down" | "neutral" }> = {
  POSITIVE: { highlight: "긍정적인", tone: "up" },
  NEGATIVE: { highlight: "부정적인", tone: "down" },
  NEUTRAL: { highlight: "무난한", tone: "neutral" },
};

function EvaluationView({ report }: { report: FestivalReportEvaluation }) {
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);
  // 백엔드의 evaluationAvailable은 AI 분석이 꺼져 있으면 항상 false다.
  // 리뷰 집계는 AI와 무관하게 채워지므로 reviews.available도 함께 본다.
  if (!report.evaluationAvailable && !report.reviews.available)
    return <EmptyState message="아직 제공할 수 있는 방문객 평가 데이터가 없습니다." />;

  const { reviews } = report;
  const featured = reviews.featuredReviews.length
    ? reviews.featuredReviews.slice(0, 3)
    : reviews.reviews.slice(0, 3);
  const sentiment = SENTIMENT_HEADLINE[report.ai.headlineSentiment];
  const scoreDeltaLabel =
    reviews.scoreDelta === null
      ? undefined
      : `전년대비 ${Math.abs(reviews.scoreDelta).toFixed(2)}점 ${reviews.scoreDelta >= 0 ? "증가" : "감소"}`;

  return (
    <>
      {sentiment ? (
        <ReportHeadline
          before="이번 축제는 "
          highlight={sentiment.highlight}
          after=" 반응이에요"
          tone={sentiment.tone}
        />
      ) : (
        <ReportHeadline before="방문객이 남긴 평가를 확인해 보세요." tone="neutral" />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="종합 만족도 점수">
          <div className="flex flex-col gap-6">
            <div>
              <p className="flex items-baseline gap-1">
                <span className="heading-small text-zinc-950">
                  {reviews.averageScore === null ? "-" : reviews.averageScore.toFixed(2)}
                </span>
                <span className="body-regular text-zinc-950">점</span>
              </p>
              {scoreDeltaLabel ? (
                <p
                  className={cn(
                    "mt-1 body-caption",
                    (reviews.scoreDelta ?? 0) >= 0 ? "text-secondary-600" : "text-red-600",
                  )}
                >
                  {scoreDeltaLabel}
                </p>
              ) : null}
            </div>
            <RatingDistributionChart distribution={reviews.ratingDistribution} />
            <p className="body-small text-zinc-500">
              총 리뷰{" "}
              <span className="body-small-bold text-zinc-950">
                {reviews.reviewCount.toLocaleString()}건
              </span>
            </p>
          </div>
        </Panel>
      </div>

      <Panel
        title="방문객 대표 리뷰"
        action={
          reviews.reviews.length ? (
            <Button variant="outline" size="sm" onClick={() => setAllReviewsOpen(true)}>
              전체 리뷰 보기
            </Button>
          ) : null
        }
      >
        {featured.length ? (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {featured.map((review, index) => (
              <li key={review.reviewId ?? `${review.displayName}-${index}`}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="body-small text-zinc-400">표시할 리뷰가 없습니다.</p>
        )}
      </Panel>

      <AllReviewsDialog
        open={allReviewsOpen}
        onOpenChange={setAllReviewsOpen}
        reviews={reviews.reviews}
        reviewCount={reviews.reviewCount}
        hasMore={reviews.hasMore}
      />
    </>
  );
}

export function ReportPanel({
  festivalId,
  previousFestivalId = null,
  live = false,
}: {
  festivalId: string;
  /** 같은 시리즈의 직전 회차 축제 id. 있으면 "지난 리포트 보기" 링크를 노출한다. */
  previousFestivalId?: string | null;
  /** 진행 중 축제는 일별 집계가 반영되도록 주기적으로 최신 리포트를 다시 읽는다. */
  live?: boolean;
}) {
  const [activeSection, setActiveSection] = useState<ReportSection>("축제성과");
  const performanceQuery = useQuery({
    queryKey: ["festival-report-performance", festivalId],
    queryFn: () => getFestivalReportPerformance(festivalId),
    enabled: activeSection === "축제성과",
    refetchInterval: live ? 60_000 : false,
  });
  const evaluationQuery = useQuery({
    queryKey: ["festival-report-evaluation", festivalId],
    queryFn: () => getFestivalReportEvaluation(festivalId),
    enabled: activeSection === "방문객평가",
    refetchInterval: live ? 60_000 : false,
  });
  const activeQuery = activeSection === "축제성과" ? performanceQuery : evaluationQuery;

  return (
    <div id="festival-performance" className="flex flex-col gap-6">
      <ReportBreadcrumb section={activeSection} onSectionChange={setActiveSection} />
      {activeQuery.isLoading ? (
        <p className="body-regular text-zinc-500">리포트를 불러오는 중...</p>
      ) : null}
      {activeQuery.isError ? (
        <p className="body-small text-error">{getApiErrorMessage(activeQuery.error)}</p>
      ) : null}
      {activeSection === "축제성과" && performanceQuery.data ? (
        <PerformanceView report={performanceQuery.data} previousFestivalId={previousFestivalId} />
      ) : null}
      {activeSection === "방문객평가" && evaluationQuery.data ? (
        <EvaluationView key={festivalId} report={evaluationQuery.data} />
      ) : null}
    </div>
  );
}
