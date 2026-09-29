"use client";

import { useEffect, useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateQueueTailAsAdmin } from "@/features/dashboard/api";
import {
  buildQueueZones,
  QUEUE_ZONE_METERS,
  queueTailPointForMeters,
  queueTailPointOnPath,
} from "@/features/dashboard/queueDistanceZones";
import type { FestivalQueue } from "@/features/staffMap/types";
import { getApiErrorMessage } from "@/lib/api/httpError";
import type { LatLng } from "./latLng";
import { getQueuePlan } from "./queuePlanApi";

export function AdminQueueZonePanel({
  festivalId,
  boothId,
  boothName,
  boothPoint,
  queue,
  onClose,
}: {
  festivalId: string;
  boothId: number;
  boothName: string;
  boothPoint: LatLng;
  queue: FestivalQueue;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const [zoneId, setZoneId] = useState("");
  const queryClient = useQueryClient();
  const planQuery = useQuery({
    queryKey: ["booth-queue-plan", festivalId, boothId],
    queryFn: () => getQueuePlan(festivalId, boothId),
    retry: false,
  });
  const plan = planQuery.data?.path?.length ? planQuery.data : null;
  const zones = buildQueueZones(plan?.lengthMeters);
  const zone = zones.find((item) => item.id === zoneId);

  const update = useMutation({
    mutationFn: async () => {
      if (!zone) throw new Error("줄끝 존을 선택해 주세요.");
      if (plan) {
        const tail = queueTailPointOnPath(plan.path, zone.meters);
        return updateQueueTailAsAdmin(festivalId, queue.queueId, {
          tailLatitude: tail.lat,
          tailLongitude: tail.lng,
          expectedRevision: queue.observationRevision,
          planRevision: plan.revision,
        });
      }
      const tail = queueTailPointForMeters(boothPoint, zone.meters);
      return updateQueueTailAsAdmin(festivalId, queue.queueId, {
        tailLatitude: tail.lat,
        tailLongitude: tail.lng,
        queueTailMeters: zone.meters,
        path: [],
        expectedRevision: queue.observationRevision,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["festival-queues", festivalId] });
      void queryClient.invalidateQueries({ queryKey: ["festival-dashboard", festivalId] });
      toast.success("줄끝 존을 갱신했습니다.");
      onClose();
    },
  });

  useEffect(() => {
    const onOutside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (rootRef.current?.contains(target) || target.closest('[data-slot="select-content"]'))
        return;
      if (!update.isPending) onClose();
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [onClose, update.isPending]);

  return (
    <section
      ref={rootRef}
      aria-label="줄끝 갱신"
      className="pointer-events-auto absolute right-16 bottom-4 left-4 z-[120] rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-md lg:right-28 lg:bottom-10 lg:left-[23rem]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="body-small-bold text-zinc-950">{boothName} · 줄끝 갱신</p>
        <IconButton
          icon={<Cross2Icon />}
          variant="ghost"
          size="sm"
          aria-label="닫기"
          onClick={onClose}
        />
      </div>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate();
        }}
      >
        <Select
          value={zoneId}
          onValueChange={setZoneId}
          disabled={planQuery.isPending || update.isPending}
        >
          <SelectTrigger className="min-w-0 flex-1" aria-label="줄끝 존 선택">
            <SelectValue placeholder={planQuery.isPending ? "불러오는 중..." : "존 선택"} />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            {zones.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label} · {item.meters}m
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={!zone || update.isPending}>
          {update.isPending ? "갱신 중..." : "줄끝 갱신"}
        </Button>
      </form>
      <p className="body-caption mt-2 text-zinc-500">
        {plan
          ? `사전 동선을 ${QUEUE_ZONE_METERS}m씩 나눈 존입니다.`
          : `존 1개당 ${QUEUE_ZONE_METERS}m로 계산합니다.`}
      </p>
      {update.isError ? (
        <p role="alert" className="body-caption mt-2 text-error">
          {getApiErrorMessage(update.error, "줄끝을 갱신하지 못했습니다.")}
        </p>
      ) : null}
    </section>
  );
}
