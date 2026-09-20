"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { CongestionText } from "@/components/ui/CongestionBadge";
import { formatWaitMinutes } from "@/lib/formatWaitMinutes";
import { updateQueueTailAsAdmin } from "./api";
import type { Booth } from "./types";
import { getQueuePlan } from "@/features/boothmap/queuePlanApi";
import {
  buildQueueZones,
  queueTailPointForMeters,
  queueTailPointOnPath,
} from "./queueDistanceZones";

/**
 * 선택한 부스의 줄끝을 갱신하는 폼. 스태프 앱의 `QueueUpdateSheet`와 같은 방식으로,
 * 미리 그려 둔 대기 동선이 있으면 그 줄을 나눈 존을 고르고 없으면 눈대중 존을 고른다.
 * 관리자 콘솔은 지도 하단바 한 줄 안에 들어가야 해서 시트 대신 인라인 폼으로 둔다.
 */
function QueueTailForm({
  festivalId,
  booth,
  onUpdated,
}: {
  festivalId: string;
  booth: Booth;
  onUpdated: () => void;
}) {
  const [zoneId, setZoneId] = useState("");

  const planQuery = useQuery({
    queryKey: ["queuePlan", festivalId, booth.boothId],
    queryFn: () => getQueuePlan(festivalId, Number(booth.boothId)),
    staleTime: 5 * 60 * 1000,
    // 동선을 못 읽어도 줄 보고는 막지 않는다. 눈대중 존으로 바로 넘어간다.
    retry: false,
  });
  const plan = planQuery.data?.path?.length ? planQuery.data : null;
  const zones = buildQueueZones(plan?.lengthMeters);

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!booth.queueId) throw new Error("이 부스의 대기열 정보를 찾을 수 없습니다.");
      const zone = zones.find((candidate) => candidate.id === zoneId);
      if (!zone) throw new Error("줄끝 존을 선택해 주세요.");
      if (plan) {
        // 경로를 빼고 보내야 서버가 사전 동선에 투영해 실제 줄 길이를 계산한다.
        const tail = queueTailPointOnPath(plan.path, zone.meters);
        return updateQueueTailAsAdmin(festivalId, booth.queueId, {
          tailLatitude: tail.lat,
          tailLongitude: tail.lng,
          expectedRevision: booth.observationRevision,
          planRevision: plan.revision,
        });
      }
      if (booth.lat === undefined || booth.lng === undefined) {
        throw new Error("부스 좌표를 찾을 수 없습니다.");
      }
      const tail = queueTailPointForMeters({ lat: booth.lat, lng: booth.lng }, zone.meters);
      return updateQueueTailAsAdmin(festivalId, booth.queueId, {
        tailLatitude: tail.lat,
        tailLongitude: tail.lng,
        queueTailMeters: zone.meters,
        path: [],
        expectedRevision: booth.observationRevision,
      });
    },
    onSuccess: () => {
      toast.success("줄끝 위치를 갱신했습니다.");
      onUpdated();
      setZoneId("");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "줄끝을 갱신하지 못했습니다.")),
  });

  if (!booth.queueId) {
    return <p className="body-caption text-zinc-500">이 부스에는 대기열이 아직 없습니다.</p>;
  }
  if (booth.lat === undefined || booth.lng === undefined) {
    return (
      <p className="body-caption text-zinc-500">부스 좌표를 등록하면 줄끝을 갱신할 수 있습니다.</p>
    );
  }

  return (
    <form
      className="flex shrink-0 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        updateMutation.mutate();
      }}
    >
      {/* 동선을 읽는 동안 고르게 두면 존 개수가 줄면서 고른 값이 사라진다. */}
      <Select value={zoneId} onValueChange={setZoneId} disabled={planQuery.isPending}>
        <SelectTrigger className="h-10 w-36" aria-label="줄끝 존 선택">
          <SelectValue placeholder={planQuery.isPending ? "불러오는 중..." : "존 선택"} />
        </SelectTrigger>
        <SelectContent>
          {zones.map((zone) => (
            <SelectItem key={zone.id} value={zone.id}>
              {zone.label} · {zone.meters}m
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={!zoneId || updateMutation.isPending} className="shrink-0">
        {updateMutation.isPending ? "갱신 중..." : "줄끝 갱신"}
      </Button>
    </form>
  );
}

function BoothQueueUpdateBar({
  festivalId,
  booth,
  canUpdateQueue,
  onUpdated,
}: {
  festivalId: string;
  booth: Booth;
  canUpdateQueue: boolean;
  onUpdated: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="body-small-bold wrap-anywhere text-zinc-950">{booth.name}</span>
          </div>
          <p className="body-caption text-zinc-500">
            혼잡도{" "}
            {booth.congestionLevel ? (
              <CongestionText level={booth.congestionLevel} className="body-caption" />
            ) : (
              "미입력"
            )}{" "}
            · 예상 대기시간 {formatWaitMinutes(booth.waitMinutes)}
            {booth.congestionUpdatedAt
              ? ` · 관측 ${new Date(booth.congestionUpdatedAt.includes("+") || booth.congestionUpdatedAt.endsWith("Z") ? booth.congestionUpdatedAt : `${booth.congestionUpdatedAt}+09:00`).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" })}`
              : " · 미관측"}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {booth.lastQueueUpdater ? (
          <p className="body-caption min-w-0 wrap-anywhere text-zinc-500">
            최근 갱신: {booth.lastQueueUpdater.name}
          </p>
        ) : null}
        {canUpdateQueue ? (
          <QueueTailForm
            // 다른 부스를 고르면 이전 부스에 맞춰 둔 구역 선택은 의미가 없어 폼을 새로 띄운다.
            key={booth.boothId}
            festivalId={festivalId}
            booth={booth}
            onUpdated={onUpdated}
          />
        ) : null}
      </div>
    </div>
  );
}

export interface DashboardStatsBarProps {
  festivalId: string;
  selectedBooth: Booth;
  /** 줄끝 갱신 폼 노출 여부. 진행중인 축제에 배정된 관리자에게만 연다. */
  canUpdateQueue: boolean;
  onUpdated: () => void;
}

export function DashboardStatsBar({
  festivalId,
  selectedBooth,
  canUpdateQueue,
  onUpdated,
}: DashboardStatsBarProps) {
  return (
    <BoothQueueUpdateBar
      festivalId={festivalId}
      booth={selectedBooth}
      canUpdateQueue={canUpdateQueue}
      onUpdated={onUpdated}
    />
  );
}
