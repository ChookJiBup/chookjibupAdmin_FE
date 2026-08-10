"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { CongestionBadge } from "@/components/ui/CongestionBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MOCK_ZONES } from "./mockData";
import type { Booth, BoothZone } from "./types";

function findZoneName(zones: BoothZone[], zoneId: string) {
  return zones.find((zone) => zone.zoneId === zoneId)?.name ?? "";
}

async function mockUpdateQueueTail(boothId: string, zone: string) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { boothId, zone };
}

function BoothQueueUpdateBar({ booth }: { booth: Booth }) {
  const [zone, setZone] = useState(booth.queueZones[0]);

  const updateMutation = useMutation({
    mutationFn: () => mockUpdateQueueTail(booth.boothId, zone),
    onSuccess: () => {
      toast.success("줄끝이 갱신되었습니다.");
    },
  });

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="body-small text-zinc-500">
              {findZoneName(MOCK_ZONES, booth.zoneId)}
            </span>
            <span className="body-small text-zinc-300">&gt;</span>
            <span className="body-small-bold text-zinc-950">{booth.name}</span>
            <CongestionBadge level={booth.congestionLevel} />
          </div>
          <p className="body-caption text-zinc-400">
            {zone} · 예상 대기시간 {booth.waitMinutes}분
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {booth.queueZones.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? "갱신 중..." : "줄끝 갱신하기"}
        </Button>
      </div>
    </div>
  );
}

export function DashboardStatsBar({ selectedBooth }: { selectedBooth: Booth }) {
  return <BoothQueueUpdateBar booth={selectedBooth} />;
}
