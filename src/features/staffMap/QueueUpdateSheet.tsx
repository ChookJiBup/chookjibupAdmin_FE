"use client";

import { useEffect, useRef, useState } from "react";
import { Cross2Icon, UpdateIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { CongestionText } from "@/components/ui/CongestionBadge";
import { IconButton } from "@/components/ui/IconButton";
import { AdminBadge, StaffBadge } from "@/components/ui/RoleBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Booth } from "@/features/dashboard/types";
import {
  buildQueueZones,
  QUEUE_ZONE_METERS,
  queueTailPointForMeters,
  queueTailPointOnPath,
} from "@/features/dashboard/queueDistanceZones";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getStaffQueuePlan, updateQueueTail } from "./api";
import type { FestivalQueue } from "./types";
import { formatRelativeTime } from "./utils";

export interface QueueUpdateSheetProps {
  festivalId: string;
  booth: Booth;
  queue: FestivalQueue;
  /** 부스 좌표가 없는 경우 보고 거리 요청에 사용할 축제 중심. */
  mapCenter: { lat: number; lng: number };
  /** 최신 정보를 다시 받아오는 중인지. 참이면 새로고침 아이콘이 돈다. */
  refreshing?: boolean;
  onClose: () => void;
  /** 최신 정보를 다시 읽는다. Promise를 돌려주면 다 읽을 때까지 시트를 닫지 않는다. */
  onUpdated: () => void | Promise<unknown>;
}

/**
 * 선택한 부스의 줄끝 위치를 갱신하는 하단 시트.
 *
 * 미리 그려 둔 대기 동선이 있으면 그 줄을 10m씩 나눠 존으로 보여 주고, 고른 존만큼
 * 줄을 따라간 지점을 줄끝으로 보낸다. 줄이 꺾여 있어도 서버가 그 지점까지의 경로
 * 길이를 그대로 되짚으므로 직선거리로 뭉개지지 않는다.
 *
 * 동선을 아직 그리지 않은 부스는 예전처럼 눈대중 존의 보고 거리만 보낸다.
 * 혼잡도와 예상 대기시간은 어느 쪽이든 서버가 환산한다.
 */
export function QueueUpdateSheet({
  festivalId,
  booth,
  queue,
  mapCenter,
  refreshing = false,
  onClose,
  onUpdated,
}: QueueUpdateSheetProps) {
  const [zoneId, setZoneId] = useState("");
  /*
    받아오는 일이 워낙 빨리 끝나 아이콘이 도는지 알아볼 수 없었다. 눌렀다는 것이
    보이도록 잠시 더 돌린다.
  */
  const [spinning, setSpinning] = useState(false);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
    },
    [],
  );

  const boothPoint =
    booth.lat !== undefined && booth.lng !== undefined ? { lat: booth.lat, lng: booth.lng } : null;

  /*
    동선은 축제 준비 단계에서 그려 두고 현장에서는 거의 바뀌지 않으므로, 시트를 열 때
    한 번만 읽는다. 없는 부스는 404를 null로 받아 눈대중 존으로 넘어간다.
  */
  const planQuery = useQuery({
    queryKey: ["staffQueuePlan", festivalId, queue.boothId],
    queryFn: () => getStaffQueuePlan(festivalId, queue.boothId),
    staleTime: 5 * 60 * 1000,
    // 동선을 못 읽어도 줄 보고는 막지 않는다. 눈대중 존으로 바로 넘어간다.
    retry: false,
  });
  const plan = planQuery.data?.path?.length ? planQuery.data : null;
  const zones = buildQueueZones(plan?.lengthMeters);
  const zone = zones.find((item) => item.id === zoneId);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!zone) throw new Error("줄끝 존을 선택해 주세요.");
      if (plan) {
        /*
          경로를 함께 보내지 않아야 서버가 사전 동선에 투영해 실제 줄 길이를 계산한다.
          planRevision을 같이 보내 두면 그 사이 동선이 바뀐 경우 409로 막힌다.
        */
        const tail = queueTailPointOnPath(plan.path, zone.meters);
        await updateQueueTail(festivalId, queue.queueId, {
          tailLatitude: tail.lat,
          tailLongitude: tail.lng,
          expectedRevision: queue.observationRevision,
          planRevision: plan.revision,
        });
        return;
      }
      const point = boothPoint ?? mapCenter;
      const tail = queueTailPointForMeters(point, zone.meters);
      await updateQueueTail(festivalId, queue.queueId, {
        tailLatitude: tail.lat,
        tailLongitude: tail.lng,
        queueTailMeters: zone.meters,
        path: [],
        expectedRevision: queue.observationRevision,
      });
    },
    onSuccess: async () => {
      toast.success("줄끝 존을 갱신했습니다.");
      /*
        다시 읽기를 기다리지 않고 닫으면, 시트가 사라진 자리의 부스 바가 잠깐 옛 거리를
        보여 준다(방금 저장한 값이 아니라 저장 직전 값이라 「먹지 않았나?」 싶어진다).
        TanStack Query는 onSuccess가 끝날 때까지 mutation을 pending으로 두므로, 기다리는
        동안 버튼도 「갱신 중...」으로 남는다.
      */
      await onUpdated();
      // 갱신된 값은 부스 바에서 다시 확인할 수 있으므로 시트는 닫는다.
      onClose();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "줄끝 위치를 갱신하지 못했습니다."));
    },
  });

  return (
    // 화면설계서 EDIT01: 지도 위에 화면 폭 전체로 올라오는 하단 모달.
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-full overflow-y-auto rounded-t-2xl border-t border-zinc-200 bg-white px-4 pt-3 pb-8 shadow-lg">
      {/* 부스명은 가운데, 닫기는 오른쪽 끝에 둔다. */}
      <div className="relative flex items-center justify-center">
        <p className="body-large-bold min-w-0 truncate px-8 text-center text-zinc-950">
          {booth.name}
        </p>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="닫기"
          icon={<Cross2Icon />}
          onClick={onClose}
          className="absolute top-0 right-0"
          iconClassName="size-3 [&_svg]:size-3"
        />
      </div>

      {/* 화면설계서처럼 좌우로 꽉 찬 회색 띠에 담는다(시트 여백을 되돌려 끝까지 채운다). */}
      <div className="-mx-4 mt-[12.5px] flex items-center justify-between border-y border-zinc-200 bg-zinc-50 px-4 py-1">
        <p className="body-caption text-zinc-950">실시간 혼잡도정보</p>
        <div className="flex items-center gap-1">
          <span className="body-caption text-zinc-500">
            {formatRelativeTime(booth.congestionUpdatedAt)}
          </span>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="혼잡도 정보 새로고침"
            icon={<UpdateIcon />}
            // 눌러도 화면이 그대로면 먹은 건지 알 수 없어, 받아오는 동안 아이콘을 돌린다.
            iconClassName={`text-zinc-500 ${refreshing || spinning ? "animate-spin" : ""}`}
            disabled={refreshing || spinning}
            onClick={() => {
              setSpinning(true);
              if (spinTimer.current) clearTimeout(spinTimer.current);
              spinTimer.current = setTimeout(() => setSpinning(false), 700);
              void onUpdated();
            }}
          />
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <dt className="body-small text-zinc-950">혼잡도</dt>
          <dd>
            {booth.congestionLevel ? (
              <CongestionText level={booth.congestionLevel} className="body-small-bold" />
            ) : (
              <span className="body-small text-zinc-400">미입력</span>
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="body-small text-zinc-950">마지막 줄끝갱신자</dt>
          <dd className="flex items-center gap-2">
            {queue.lastModifierType ? (
              <>
                {queue.lastModifierName ? (
                  <span className="body-small-bold text-zinc-950">{queue.lastModifierName}</span>
                ) : null}
                {queue.lastModifierType === "STAFF" ? <StaffBadge /> : <AdminBadge />}
              </>
            ) : (
              <span className="body-small text-zinc-400">기록 없음</span>
            )}
          </dd>
        </div>
      </dl>

      <form
        className="mt-6 flex items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateMutation.mutate();
        }}
      >
        {/* 동선을 읽는 동안 고르게 두면 존 개수가 줄면서 고른 값이 사라진다. */}
        <Select
          value={zoneId}
          onValueChange={setZoneId}
          disabled={updateMutation.isPending || planQuery.isPending}
        >
          <SelectTrigger className="min-w-0 flex-1" aria-label="줄끝 존 선택">
            <SelectValue placeholder={planQuery.isPending ? "불러오는 중..." : "존 선택"} />
          </SelectTrigger>
          <SelectContent>
            {zones.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label} · {item.meters}m
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="shrink-0" disabled={!zone || updateMutation.isPending}>
          {updateMutation.isPending ? "갱신 중..." : "줄끝 갱신하기"}
        </Button>
      </form>
      <p className="body-caption mt-2 text-zinc-500">
        {plan
          ? `미리 그린 줄을 ${QUEUE_ZONE_METERS}m씩 나눈 존입니다.`
          : `존 1개당 ${QUEUE_ZONE_METERS}m로 계산합니다.`}
      </p>

      {updateMutation.isError ? (
        <p className="body-caption mt-2 text-error">
          {getApiErrorMessage(updateMutation.error, "줄끝 위치를 갱신하지 못했습니다.")}
        </p>
      ) : null}
    </div>
  );
}
