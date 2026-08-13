"use client";

import { ImageIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getManagedFestival, updateFestival } from "./api";
import type { FestivalLocationRequest } from "./types";

export function FestivalDetailPanel({ festivalId }: { festivalId: string }) {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [detailAddress, setDetailAddress] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const festivalQuery = useQuery({
    queryKey: ["managed-festival", festivalId],
    queryFn: () => getManagedFestival(festivalId),
  });
  const festival = festivalQuery.data;
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!festival) return Promise.resolve();
      const locations: FestivalLocationRequest[] = festival.locations.map((location) => ({
        ...location,
        detailAddress: location.primary
          ? (detailAddress ?? festival.detailAddress)
          : (location.detailAddress ?? undefined),
        roadAddress: location.roadAddress ?? undefined,
        jibunAddress: location.jibunAddress ?? undefined,
        postalCode: location.postalCode ?? undefined,
        buildingManagementNumber: location.buildingManagementNumber ?? undefined,
        latitude: location.latitude ?? undefined,
        longitude: location.longitude ?? undefined,
        boundaryGeometry: location.boundaryGeometry ?? undefined,
      }));
      return updateFestival(festivalId, {
        name: name ?? festival.festivalName,
        description: description ?? festival.description,
        locations,
        startDate: startDate ?? festival.startDate,
        endDate: endDate ?? festival.endDate,
        operationStartTime: festival.operationStartTime,
        operationEndTime: festival.operationEndTime,
      });
    },
    onSuccess: () => {
      setEditDialogOpen(false);
      setName(null);
      setDescription(null);
      setDetailAddress(null);
      setStartDate(null);
      setEndDate(null);
      queryClient.invalidateQueries({ queryKey: ["managed-festival", festivalId] });
      queryClient.invalidateQueries({ queryKey: ["managed-festivals"] });
    },
  });

  if (festivalQuery.isLoading) return <p className="body-regular text-zinc-500">불러오는 중...</p>;
  if (festivalQuery.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(festivalQuery.error)}</p>;
  }
  if (!festival) return null;

  return (
    <div className="col-span-3 flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 flex flex-col gap-4 rounded-lg border border-zinc-300 bg-white px-8 py-6">
          <p className="body-large-bold text-zinc-950">축제 정보</p>

          <Input
            label="축제명"
            value={name ?? festival.festivalName}
            onChange={(event) => setName(event.target.value)}
          />

          <div className="flex w-full flex-col gap-1">
            <label className="body-small-bold text-zinc-950">내용</label>
            <Textarea
              rows={3}
              value={description ?? festival.description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label className="body-small-bold text-zinc-950">장소</label>
            <div className="flex flex-col gap-2">
              <Input disabled value={festival.address} />
              <Input
                value={detailAddress ?? festival.detailAddress}
                onChange={(event) => setDetailAddress(event.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              label="시작날짜"
              wrapperClassName="flex-1"
              type="date"
              value={startDate ?? festival.startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              label="종료날짜"
              wrapperClassName="flex-1"
              type="date"
              value={endDate ?? festival.endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div className="col-span-2 flex items-center justify-center rounded-lg bg-zinc-100">
          <ImageIcon className="size-16 text-zinc-400" />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" onClick={() => setEditDialogOpen(true)}>
          수정하기
        </Button>
      </div>

      <ConfirmDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="축제를 수정하시겠습니까?"
        confirmLabel="수정"
        confirmVariant="primary"
        confirmPending={updateMutation.isPending}
        onConfirm={() => updateMutation.mutate()}
      />
      {updateMutation.isError ? (
        <p className="body-small text-error">{getApiErrorMessage(updateMutation.error)}</p>
      ) : null}
    </div>
  );
}
