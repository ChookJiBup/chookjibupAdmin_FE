"use client";

import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getFestivalReportSummary } from "./api";

// TODO(api/report-detail): 현재 결과리포트 API는 총 방문자 수, 최대 동시 방문자 수,
// 평균 대기시간만 제공한다. 전년 대비 증감, 경제효과, 일자별 방문자, 시간대별 방문,
// 구역별 혼잡도, 혼잡도 지속시간 데이터가 추가되면 아래 프리뷰 상수를 제거한다.
const DAILY_VISITORS = [980, 790, 1120];
const LAST_YEAR_VISITORS = [720, 860, 940];
const CONGESTION_RANKING = [
  { name: "이벤트김밥존", value: 92 },
  { name: "이색김밥존", value: 76 },
  { name: "명품로컬김밥존", value: 61 },
  { name: "체험존", value: 45 },
  { name: "휴게존", value: 29 },
];

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-300 bg-white p-4">
      <p className="body-small-bold text-zinc-950">{label}</p>
      <p className="heading-small text-zinc-950">{value}</p>
      <p className="body-caption text-secondary-600">{helper}</p>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-zinc-300 bg-white p-5 ${className}`}>
      <h2 className="body-small-bold text-zinc-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function VisitorTrendChart() {
  const points = DAILY_VISITORS.map((value, index) => `${index * 50},${115 - value / 12}`).join(
    " ",
  );
  const previousPoints = LAST_YEAR_VISITORS.map(
    (value, index) => `${index * 50},${115 - value / 12}`,
  ).join(" ");

  return (
    <div>
      <svg
        viewBox="0 0 100 130"
        className="h-52 w-full"
        preserveAspectRatio="none"
        aria-label="일자별 방문객 추이 차트"
      >
        {[25, 55, 85, 115].map((y) => (
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
          points={previousPoints}
          fill="none"
          stroke="var(--color-zinc-300)"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        <polyline points={points} fill="none" stroke="var(--color-primary-600)" strokeWidth="1.5" />
        {points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return <circle key={point} cx={cx} cy={cy} r="1.8" fill="var(--color-primary-600)" />;
        })}
      </svg>
      <div className="flex justify-between body-caption text-zinc-500">
        <span>1일차</span>
        <span>2일차</span>
        <span>3일차</span>
      </div>
      <div className="mt-4 flex gap-5 body-caption text-zinc-500">
        <span className="flex items-center gap-2">
          <i className="h-0.5 w-5 bg-primary" />
          올해
        </span>
        <span className="flex items-center gap-2">
          <i className="h-px w-5 border-t border-dashed border-zinc-400" />
          전년도
        </span>
      </div>
    </div>
  );
}

function Heatmap() {
  const values = [2, 3, 5, 7, 5, 3, 1, 3, 6, 8, 7, 4, 2, 4, 7, 9, 8, 5];
  return (
    <div className="grid grid-cols-6 gap-2">
      {values.map((value, index) => (
        <div
          key={index}
          className="flex aspect-square items-center justify-center rounded body-caption text-zinc-950"
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-primary-600) ${value * 9}%, white)`,
          }}
        >
          {10 + (index % 6) * 2}시
        </div>
      ))}
    </div>
  );
}

export function ReportPanel({ festivalId }: { festivalId: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"축제성과" | "방문객평가">("축제성과");
  const reportQuery = useQuery({
    queryKey: ["festival-report-summary", festivalId],
    queryFn: () => getFestivalReportSummary(festivalId),
  });
  // 백엔드가 집계 소스 미연결을 명시하면 0을 실제 집계값처럼 노출하지 않는다.
  const report = reportQuery.data?.dataAvailable ? reportQuery.data : null;

  return (
    <div id="festival-performance" className="flex flex-col gap-6">
      <div className="relative flex items-center gap-2 body-small text-zinc-500">
        <span>결과리포트</span>
        <span>&gt;</span>
        <button
          type="button"
          className="flex items-center gap-1 text-zinc-950"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {activeSection} <ChevronDownIcon />
        </button>
        {menuOpen ? (
          <div className="absolute top-7 left-20 z-10 flex w-32 flex-col rounded-md border border-zinc-200 bg-white py-1 shadow-sm">
            {(["축제성과", "방문객평가"] as const).map((section) => (
              <button
                key={section}
                type="button"
                className={`body-small px-3 py-2 text-left text-zinc-950 hover:bg-zinc-100 ${activeSection === section ? "bg-zinc-100" : ""}`}
                onClick={() => {
                  setActiveSection(section);
                  setMenuOpen(false);
                }}
              >
                {section}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <h1 className="heading-small text-zinc-950">
        이번 축제, 지난 축제보다 방문객이 <span className="text-secondary-600">23%</span>{" "}
        증가했습니다
      </h1>

      <div className="grid grid-cols-3 gap-6">
        <SummaryCard
          label="총 관광객수"
          value={`${(report?.totalVisitorCount ?? 51194).toLocaleString()} 명`}
          helper="전년대비 11,775명 증가"
        />
        <SummaryCard label="경제효과" value="164 백만원" helper="전년대비 3.6백만원 증가" />
        <SummaryCard
          label="운영효율(평균 대기시간)"
          value={`${report?.averageWaitMinutes ?? 12.4} 분`}
          helper="참여부스 30개"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Panel title="일자별 관광객 추이" className="col-span-2">
          <VisitorTrendChart />
        </Panel>
        <Panel title="요일/시간대별 방문 패턴">
          <Heatmap />
        </Panel>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Panel title="구역별 혼잡도(또는 평균 대기시간) 랭킹">
          <div className="flex flex-col gap-3">
            {CONGESTION_RANKING.map((zone) => (
              <div key={zone.name} className="grid grid-cols-[92px_1fr] items-center gap-3">
                <span className="body-caption truncate text-zinc-600">{zone.name}</span>
                <div className="h-4 rounded-sm bg-zinc-100">
                  <div
                    className="h-full rounded-sm bg-primary"
                    style={{ width: `${zone.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="혼잡도 단계별 지속시간 비율" className="col-span-2">
          <div className="flex h-16 overflow-hidden rounded-lg">
            <div className="flex w-[48%] items-center justify-center bg-primary-300 body-small-bold">
              여유 48%
            </div>
            <div className="flex w-[34%] items-center justify-center bg-point-300 body-small-bold">
              보통 34%
            </div>
            <div className="flex w-[18%] items-center justify-center bg-red-300 body-small-bold">
              혼잡 18%
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
