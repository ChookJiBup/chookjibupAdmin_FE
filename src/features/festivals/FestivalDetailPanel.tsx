"use client";

import { ImageIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bottombar } from "@/components/ui/Bottombar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { deleteFestival, getManagedFestival, searchFestivalSeries, updateFestival } from "./api";
import { DATE_DISPLAY_PATTERN, formatDateInput, toDisplayDate, toIsoDate } from "./dateFormat";
import { SearchDialog, type SearchDialogState } from "./SearchDialog";
import type { FestivalLocationRequest, FestivalSeriesSearchResult } from "./types";

export function FestivalDetailPanel({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [detailAddress, setDetailAddress] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const [festivalSearchOpen, setFestivalSearchOpen] = useState(false);
  const [festivalSearchState, setFestivalSearchState] = useState<SearchDialogState>("default");
  const [festivalSearchResults, setFestivalSearchResults] = useState<FestivalSeriesSearchResult[]>(
    [],
  );
  const [festivalSearchPending, setFestivalSearchPending] = useState(false);

  const festivalQuery = useQuery({
    queryKey: ["managed-festival", festivalId],
    queryFn: () => getManagedFestival(festivalId),
  });
  const festival = festivalQuery.data;

  async function searchFestivals(keyword: string) {
    setFestivalSearchPending(true);
    try {
      const results = await searchFestivalSeries(keyword);
      setFestivalSearchResults(results);
      setFestivalSearchState(results.length > 0 ? "result" : "none");
    } finally {
      setFestivalSearchPending(false);
    }
  }

  function applyFestivalSeries(series: FestivalSeriesSearchResult) {
    setName(series.name);
    setDescription(series.latestDescription);
    setDetailAddress(series.latestDetailAddress);
    setStartDate(toDisplayDate(series.latestStartDate));
    setEndDate(toDisplayDate(series.latestEndDate));
    setFestivalSearchOpen(false);
  }
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
        startDate: startDate ? toIsoDate(startDate) : festival.startDate,
        endDate: endDate ? toIsoDate(endDate) : festival.endDate,
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

  const deleteMutation = useMutation({
    mutationFn: () => deleteFestival(festivalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-festivals"] });
      router.push("/console");
    },
  });

  if (festivalQuery.isLoading) return <p className="body-regular text-zinc-500">불러오는 중...</p>;
  if (festivalQuery.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(festivalQuery.error)}</p>;
  }
  if (!festival) return null;

  const displayStartDate = startDate ?? toDisplayDate(festival.startDate);
  const displayEndDate = endDate ?? toDisplayDate(festival.endDate);

  function handleEditClick() {
    if (
      !DATE_DISPLAY_PATTERN.test(displayStartDate) ||
      !DATE_DISPLAY_PATTERN.test(displayEndDate)
    ) {
      setDateError("날짜는 YYYY.mm.dd 형식으로 입력해 주세요.");
      return;
    }
    if (toIsoDate(displayStartDate) > toIsoDate(displayEndDate)) {
      setDateError("종료날짜는 시작날짜보다 빠를 수 없습니다.");
      return;
    }
    setDateError(null);
    setEditDialogOpen(true);
  }

  return (
    <div className="col-span-3 flex flex-col gap-6">
      <div className="grid grid-cols-3 items-start gap-6">
        <div className="col-span-1 flex flex-col gap-4 rounded-lg border border-zinc-300 bg-white px-8 py-6">
          <p className="body-large-bold text-zinc-950">축제 정보</p>

          <Input
            label="축제명"
            layout="with-button"
            value={name ?? festival.festivalName}
            onChange={(event) => setName(event.target.value)}
            button={
              <Button type="button" onClick={() => setFestivalSearchOpen(true)}>
                축제 검색
              </Button>
            }
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
              placeholder="YYYY.mm.dd"
              inputMode="numeric"
              maxLength={10}
              value={displayStartDate}
              onChange={(event) => setStartDate(formatDateInput(event.target.value))}
            />
            <Input
              label="종료날짜"
              wrapperClassName="flex-1"
              placeholder="YYYY.mm.dd"
              inputMode="numeric"
              maxLength={10}
              value={displayEndDate}
              onChange={(event) => setEndDate(formatDateInput(event.target.value))}
            />
          </div>
          {dateError ? <p className="body-caption text-error">{dateError}</p> : null}
        </div>

        <div className="col-span-2 flex min-h-[calc(100vh-252px)] items-center justify-center rounded-lg bg-zinc-100">
          <ImageIcon className="size-16 text-zinc-400" />
        </div>
      </div>

      <Bottombar
        cancelLabel="삭제하기"
        onCancel={() => setDeleteDialogOpen(true)}
        submitLabel="수정하기"
        onSubmit={handleEditClick}
      />

      <SearchDialog
        open={festivalSearchOpen}
        onOpenChange={(next) => {
          setFestivalSearchOpen(next);
          if (!next) setFestivalSearchState("default");
        }}
        title="축제 검색"
        placeholder="축제명을 입력해 주세요"
        helperText="축제명으로 검색하면 이전 축제 정보를 불러올 수 있어요."
        helperItems={["이미 API에 등록된 축제면 이전 말고 현재 축제 정보를 불러오는지"]}
        state={festivalSearchState}
        results={festivalSearchResults.map((series) => ({
          id: series.seriesId,
          label: series.name,
          description: series.latestAddress,
        }))}
        searchPending={festivalSearchPending}
        onSearch={searchFestivals}
        noResultSubtext="하단의 직접 입력을 눌러 축제명을 등록해 주세요"
        onSelectResult={(result) => {
          const series = festivalSearchResults.find((item) => item.seriesId === result.id);
          if (series) applyFestivalSeries(series);
        }}
        onManualInput={(value) => {
          setName(value);
          setFestivalSearchOpen(false);
        }}
      />

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

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="축제를 삭제하시겠습니까?"
        description="삭제는 영구적입니다. 데이터를 복구할 수 없습니다."
        confirmLabel="확인"
        confirmPending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
      {deleteMutation.isError ? (
        <p className="body-small text-error">{getApiErrorMessage(deleteMutation.error)}</p>
      ) : null}
    </div>
  );
}
