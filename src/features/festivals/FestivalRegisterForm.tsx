"use client";

import {
  CheckIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useKakaoLoader } from "react-kakao-maps-sdk";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Bottombar } from "@/components/ui/Bottombar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { setCachedMapId } from "@/features/boothmap/mapIdCache";
import {
  createFestival,
  createFestivalWithMap,
  searchFestivalSeries,
} from "@/features/festivals/api";
import type { FestivalSeriesSearchResult } from "@/features/festivals/types";
import { getApiErrorMessage } from "@/lib/api/httpError";
import {
  createInitialLocationDrafts,
  createLocationDraft,
  isLocationDraftComplete,
  toFestivalLocationRequests,
  type LocationDraft,
} from "./locationDraft";
import { SearchDialog, type SearchDialogResult, type SearchDialogState } from "./SearchDialog";

const DATE_DISPLAY_PATTERN = /^\d{4}\.\d{2}\.\d{2}$/;

/** "yyyy-MM-dd"를 화면 표기 "YYYY.mm.dd"로 변환한다. */
function toDisplayDate(isoDate: string) {
  return isoDate.replaceAll("-", ".");
}

/** "YYYY.mm.dd" 화면 표기를 API가 요구하는 "yyyy-MM-dd"로 변환한다. */
function toIsoDate(displayDate: string) {
  return displayDate.replaceAll(".", "-");
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 숫자만 입력받아 "YYYY.mm.dd" 형태로 자동 포맷팅한다. */
function formatDateInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join(".");
}

export function FestivalRegisterForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locations, setLocations] = useState<LocationDraft[]>(() => createInitialLocationDrafts());
  const [primaryKey, setPrimaryKey] = useState(() => locations[0].key);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [boothMapFile, setBoothMapFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [festivalSearchOpen, setFestivalSearchOpen] = useState(false);
  const [festivalSearchState, setFestivalSearchState] = useState<SearchDialogState>("default");
  const [festivalSearchResults, setFestivalSearchResults] = useState<FestivalSeriesSearchResult[]>(
    [],
  );
  const [festivalSearchPending, setFestivalSearchPending] = useState(false);
  const [addressSearchTargetKey, setAddressSearchTargetKey] = useState<string | null>(null);
  const [addressSearchState, setAddressSearchState] = useState<SearchDialogState>("default");
  const [addressSearchResults, setAddressSearchResults] = useState<SearchDialogResult[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
    libraries: ["services"],
  });

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
    setLocations((current) => {
      const [first, ...rest] = current;
      return [
        {
          ...first,
          roadAddress: series.latestAddress,
          detailAddress: series.latestDetailAddress,
        },
        ...rest,
      ];
    });
    setStartDate(toDisplayDate(series.latestStartDate));
    setEndDate(toDisplayDate(series.latestEndDate));
    setFestivalSearchOpen(false);
  }

  function searchAddress(keyword: string) {
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(keyword, (data, status) => {
      if (status !== kakao.maps.services.Status.OK || data.length === 0) {
        setAddressSearchResults([]);
        setAddressSearchState("none");
        return;
      }
      setAddressSearchResults(
        data.map((item, index) => ({
          id: `${item.address_name}-${index}`,
          label: item.road_address?.address_name ?? item.address_name,
          description: item.address_name,
        })),
      );
      setAddressSearchState("result");
    });
  }

  function updateLocation(key: string, patch: Partial<Omit<LocationDraft, "key">>) {
    setLocations((current) => current.map((loc) => (loc.key === key ? { ...loc, ...patch } : loc)));
  }

  function addLocation() {
    setLocations((current) => [
      ...current,
      createLocationDraft("SUB_VENUE", `장소 ${current.length + 1}`),
    ]);
  }

  function removeLocation(key: string) {
    setLocations((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((loc) => loc.key !== key);
      if (primaryKey === key) setPrimaryKey(next[0].key);
      return next;
    });
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const request = {
        name,
        description,
        locations: toFestivalLocationRequests(locations, primaryKey),
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
        // 운영 시작/종료 시간은 이번 화면 디자인에 없어 임시 기본값을 보낸다.
        // 디자인에 운영시간 입력이 추가되면 이 기본값을 실제 입력값으로 교체해야 한다.
        operationStartTime: "09:00:00",
        operationEndTime: "18:00:00",
      };

      // 배치도 이미지를 첨부했으면 축제 생성과 동시에 배치도도 만든다 — 배치도는
      // 이 API에서만 만들 수 있어(나중에 따로 붙이는 API가 없다), 여기서 놓치면
      // 이 축제는 앞으로도 배치도를 가질 방법이 없다.
      if (boothMapFile) {
        const { festival, map } = await createFestivalWithMap(request, boothMapFile);
        setCachedMapId(festival.festivalId, map.mapId);
        return { festival, hasMap: true };
      }
      const festival = await createFestival(request);
      return { festival, hasMap: false };
    },
    onSuccess: ({ festival, hasMap }) => {
      router.push(
        hasMap
          ? `/console/festivals/${festival.festivalId}/boothmap`
          : `/console/festivals/${festival.festivalId}`,
      );
    },
  });

  function handleSubmitClick() {
    if (!DATE_DISPLAY_PATTERN.test(startDate) || !DATE_DISPLAY_PATTERN.test(endDate)) {
      setFormError("날짜는 YYYY.mm.dd 형식으로 입력해 주세요.");
      return;
    }
    if (toIsoDate(startDate) > toIsoDate(endDate)) {
      setFormError("종료날짜는 시작날짜보다 빠를 수 없습니다.");
      return;
    }
    if (locations.some((location) => !isLocationDraftComplete(location))) {
      setFormError("모든 장소에 이름과 주소를 입력해 주세요.");
      return;
    }
    setFormError(null);
    setSubmitDialogOpen(true);
  }

  const addressSearchTarget = locations.find((loc) => loc.key === addressSearchTargetKey) ?? null;

  return (
    <div className="col-span-2 flex min-w-0 flex-col gap-6 pb-24">
      <FormSection label="축제 기본정보 입력">
        <Input
          layout="with-button"
          placeholder="축제명을 입력해 주세요"
          value={name}
          onChange={(event) => setName(event.target.value)}
          button={
            <Button type="button" onClick={() => setFestivalSearchOpen(true)}>
              축제 검색하기
            </Button>
          }
        />
        <Textarea
          placeholder="축제 설명을 작성해 주세요"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </FormSection>

      <FormSection label="축제 상세정보 입력">
        <div className="flex flex-col gap-4">
          {locations.map((location, index) => (
            <div key={location.key} className="flex flex-col gap-3">
              {index > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="body-small-bold text-zinc-950">장소 {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<TrashIcon />}
                    onClick={() => removeLocation(location.key)}
                  >
                    삭제
                  </Button>
                </div>
              ) : null}

              {location.roadAddress ? (
                <Input
                  disabled
                  value={location.roadAddress}
                  className="disabled:border-zinc-400!"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddressSearchTargetKey(location.key);
                    setAddressSearchState("default");
                  }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 body-regular text-zinc-950 transition-colors hover:bg-zinc-50"
                >
                  <MagnifyingGlassIcon className="size-4" />
                  주소 찾기
                </button>
              )}
              <Input
                placeholder="상세주소"
                value={location.detailAddress}
                onChange={(event) =>
                  updateLocation(location.key, { detailAddress: event.target.value })
                }
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Input
            label="시작날짜"
            wrapperClassName="flex-1"
            placeholder="YYYY.mm.dd"
            inputMode="numeric"
            maxLength={10}
            value={startDate}
            onChange={(event) => setStartDate(formatDateInput(event.target.value))}
          />
          <Input
            label="종료날짜"
            wrapperClassName="flex-1"
            placeholder="YYYY.mm.dd"
            inputMode="numeric"
            maxLength={10}
            value={endDate}
            onChange={(event) => setEndDate(formatDateInput(event.target.value))}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          icon={<PlusIcon />}
          className="mt-3"
          onClick={addLocation}
        >
          장소 추가
        </Button>
        {formError ? <p className="body-caption text-error">{formError}</p> : null}
      </FormSection>

      <FormSection label="축제부스지도 첨부">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => setBoothMapFile(event.target.files?.[0] ?? null)}
        />
        <Button type="button" className="w-full" onClick={() => fileInputRef.current?.click()}>
          파일 첨부하기
        </Button>
        {boothMapFile ? (
          <Attachment className="border-zinc-200 bg-white has-data-[slot=attachment-content]:px-4 has-data-[slot=attachment-content]:py-2">
            <AttachmentMedia className="size-8 rounded-full bg-zinc-100">
              <CheckIcon className="size-4 text-zinc-950" />
            </AttachmentMedia>
            <AttachmentContent className="flex-none">
              <AttachmentTitle className="body-small-bold! text-zinc-950">
                {boothMapFile.name}
              </AttachmentTitle>
              <AttachmentDescription className="body-caption! text-zinc-500">
                업로드 · {formatFileSize(boothMapFile.size)}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions className="ml-10">
              <AttachmentAction
                className="hover:bg-zinc-100"
                onClick={() => {
                  setBoothMapFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <Cross2Icon className="size-3 text-zinc-500" />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ) : null}
      </FormSection>

      {createMutation.isError ? (
        <p className="body-small text-error">{getApiErrorMessage(createMutation.error)}</p>
      ) : null}

      <Bottombar onCancel={() => setCancelDialogOpen(true)} onSubmit={handleSubmitClick} />

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

      <SearchDialog
        open={addressSearchTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setAddressSearchTargetKey(null);
            setAddressSearchState("default");
          }
        }}
        title="주소 찾기"
        placeholder="주소를 입력하세요"
        helperText="도로명, 건물명, 또는 지번 중 편한 방법으로 검색하세요."
        helperItems={[
          "도로명 + 건물번호(예: 세계로 10)",
          "지역명(동/리) + 번지(예: 반곡동 1914-6)",
          "지역명(동/리) + 건물명(예: 한국관광공사)",
        ]}
        state={addressSearchState}
        results={addressSearchResults}
        onSearch={searchAddress}
        noResultSubtext="하단의 직접 입력을 눌러 주소를 등록해 주세요"
        onSelectResult={(result) => {
          if (addressSearchTargetKey)
            updateLocation(addressSearchTargetKey, { roadAddress: result.label });
          setAddressSearchTargetKey(null);
        }}
        onManualInput={(value) => {
          if (addressSearchTargetKey)
            updateLocation(addressSearchTargetKey, { roadAddress: value });
          setAddressSearchTargetKey(null);
        }}
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="등록을 취소하시겠습니까?"
        description="작성된 정보는 저장되지 않습니다."
        cancelLabel="취소"
        confirmLabel="확인"
        onConfirm={() => router.back()}
      />

      <ConfirmDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        title="축제를 등록하시겠습니까?"
        cancelLabel="취소"
        confirmLabel="등록"
        confirmVariant="primary"
        confirmPending={createMutation.isPending}
        onConfirm={() => createMutation.mutate()}
      />
    </div>
  );
}
