"use client";

import { useEffect, useRef, useState } from "react";
import { Cross2Icon, DrawingPinIcon, UpdateIcon } from "@radix-ui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { CongestionText } from "@/components/ui/CongestionBadge";
import { IconButton } from "@/components/ui/IconButton";
import { AdminBadge, StaffBadge } from "@/components/ui/RoleBadge";
import type { Booth } from "@/features/dashboard/types";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { updateQueueTail } from "./api";
import { QueueTailPicker, type QueueTailPoint } from "./QueueTailPicker";
import type { FestivalQueue } from "./types";
import { distanceInMeters, formatRelativeTime } from "./utils";

export interface QueueUpdateSheetProps {
  festivalId: string;
  booth: Booth;
  queue: FestivalQueue;
  /** 지도 초기 중심. 부스 좌표가 없어도 줄 끝을 찍을 수 있게 축제 중심을 받는다. */
  mapCenter: QueueTailPoint;
  /** 최신 정보를 다시 받아오는 중인지. 참이면 새로고침 아이콘이 돈다. */
  refreshing?: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

/**
 * 선택한 부스의 줄끝 위치를 갱신하는 하단 시트.
 *
 * 스태프는 줄이 끝나는 자리를 지도에서 찍기만 한다. 혼잡도와 예상 대기시간은 서버가
 * 부스에서 줄 끝까지의 거리로 환산하므로(BoothCongestionEstimator) 결과만 보여준다.
 * 백엔드 계약에는 «존» 같은 구분이 없고 줄 끝 좌표와 거리만 오간다.
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
  const [pickedTail, setPickedTail] = useState<QueueTailPoint | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
  const tailPoint = pickedTail;
  const tailMeters = boothPoint && tailPoint ? distanceInMeters(boothPoint, tailPoint) : null;

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!tailPoint) return;
      await updateQueueTail(festivalId, queue.queueId, {
        tailLatitude: tailPoint.lat,
        tailLongitude: tailPoint.lng,
        queueTailMeters: tailMeters ?? undefined,
      });
    },
    onSuccess: () => {
      toast.success("줄끝 위치를 갱신했습니다.");
      onUpdated();
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
              onUpdated();
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
        <Button
          type="button"
          variant="outline"
          className="min-w-0 flex-1 justify-start"
          icon={<DrawingPinIcon />}
          disabled={updateMutation.isPending}
          onClick={() => setPickerOpen(true)}
        >
          <span className="truncate">
            {tailPoint
              ? tailMeters === null
                ? "줄 끝 지점 선택함"
                : `부스에서 약 ${tailMeters}m`
              : "지도에서 줄 끝 찍기"}
          </span>
        </Button>
        <Button
          type="submit"
          className="shrink-0"
          disabled={!tailPoint || updateMutation.isPending}
        >
          {updateMutation.isPending ? "갱신 중..." : "줄끝 갱신하기"}
        </Button>
      </form>

      {updateMutation.isError ? (
        <p className="body-caption mt-2 text-error">
          {getApiErrorMessage(updateMutation.error, "줄끝 위치를 갱신하지 못했습니다.")}
        </p>
      ) : null}

      {pickerOpen ? (
        <QueueTailPicker
          boothName={booth.name}
          boothPoint={boothPoint}
          center={pickedTail ?? boothPoint ?? mapCenter}
          initialTail={
            pickedTail ??
            (queue.tailLatitude !== null && queue.tailLongitude !== null
              ? { lat: queue.tailLatitude, lng: queue.tailLongitude }
              : null)
          }
          onCancel={() => setPickerOpen(false)}
          onConfirm={(point) => {
            setPickedTail(point);
            setPickerOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
