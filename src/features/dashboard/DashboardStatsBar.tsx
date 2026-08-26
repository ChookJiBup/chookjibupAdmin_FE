"use client";

import { Button } from "@/components/ui/Button";
import type { Booth } from "./types";

function BoothQueueUpdateBar({ booth }: { booth: Booth }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="body-small-bold text-zinc-950">{booth.name}</span>
          </div>
          <p className="body-caption text-zinc-500">
            줄끝 조회·갱신 API가 없어 현재 이 기능을 사용할 수 없습니다.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button disabled>줄끝 갱신하기</Button>
      </div>
    </div>
  );
}

export function DashboardStatsBar({ selectedBooth }: { selectedBooth: Booth }) {
  return <BoothQueueUpdateBar booth={selectedBooth} />;
}
