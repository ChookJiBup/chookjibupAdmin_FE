import type { CongestionLevel } from "@/features/dashboard/types";

interface BoothCongestionShareRow {
  boothName: string;
  shares: Record<CongestionLevel, number>;
}

const LEVEL_ORDER: CongestionLevel[] = ["HIGH", "MEDIUM", "LOW"];
const LEVEL_LABELS: Record<CongestionLevel, string> = {
  HIGH: "혼잡",
  MEDIUM: "보통",
  LOW: "여유",
};
const LEVEL_BAR_CLASSES: Record<CongestionLevel, string> = {
  HIGH: "bg-red-600",
  MEDIUM: "bg-point-500",
  LOW: "bg-secondary-600",
};

export function BoothCongestionShareChart({ rows }: { rows: BoothCongestionShareRow[] }) {
  if (!rows.length) return <p className="body-small text-zinc-400">혼잡도 데이터가 없습니다.</p>;

  const sortedRows = [...rows].sort((a, b) => b.shares.HIGH - a.shares.HIGH);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {sortedRows.map((row) => {
          const total = LEVEL_ORDER.reduce((sum, level) => sum + row.shares[level], 0) || 1;
          return (
            <li
              key={row.boothName}
              className="grid grid-cols-1 items-center gap-1 sm:grid-cols-[140px_1fr] sm:gap-3"
            >
              <span className="truncate body-small text-zinc-950">{row.boothName}</span>
              <div className="flex h-5 overflow-hidden rounded-md bg-zinc-100">
                {LEVEL_ORDER.map((level) => {
                  const percent = (row.shares[level] / total) * 100;
                  if (percent <= 0) return null;
                  return (
                    <div
                      key={level}
                      className={`flex items-center justify-center ${LEVEL_BAR_CLASSES[level]}`}
                      style={{ width: `${percent}%` }}
                      title={`${row.boothName} · ${LEVEL_LABELS[level]} ${Math.round(percent)}%`}
                    >
                      {percent >= 12 ? (
                        <span className="body-caption text-white">{Math.round(percent)}%</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-4 body-caption text-zinc-500">
        {LEVEL_ORDER.map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${LEVEL_BAR_CLASSES[level]}`} />
            {LEVEL_LABELS[level]}
          </span>
        ))}
      </div>
    </div>
  );
}
