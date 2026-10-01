"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AttachmentField } from "@/components/ui/AttachmentField";
import { Bottombar } from "@/components/ui/Bottombar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { canCreateFestival } from "@/features/auth/admin/types";
import {
  createFestival,
  createFestivalWithThumbnail,
  searchFestivalSeries,
} from "@/features/festivals/api";
import type {
  FestivalSeriesSearchResult,
  FestivalVisitorCountInputMode,
} from "@/features/festivals/types";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { geocodeAddress } from "@/lib/kakaoGeocoder";
import { useKakaoMapLoader } from "@/lib/kakaoMapLoader";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { DateField } from "./DateField";
import { FestivalLocationFields } from "./FestivalLocationFields";
import {
  hasFestivalPeriodError,
  isFestivalEnded,
  toIsoDate,
  validateFestivalPeriod,
} from "./dateFormat";
import {
  createInitialLocationDrafts,
  createLocationDraft,
  hasLocationDraftCoordinate,
  isLocationDraftComplete,
  toFestivalLocationRequests,
  type LocationDraft,
} from "./locationDraft";
import { SearchDialog, type SearchDialogResult, type SearchDialogState } from "./SearchDialog";
import {
  FESTIVAL_SEARCH_HELPER_ITEMS,
  FESTIVAL_SEARCH_HELPER_TEXT,
  findFestivalSearchResult,
  toDisplayDateOrEmpty,
  toFestivalSearchDialogResult,
} from "./seriesSearch";

const FESTIVAL_THUMBNAIL_ACCEPT = "image/png,image/jpeg";
const FESTIVAL_THUMBNAIL_MIME_TYPES = ["image/png", "image/jpeg"];
const FESTIVAL_THUMBNAIL_MAX_BYTES = 50 * 1024 * 1024;
const ADDRESS_GEOCODE_FAILED_MESSAGE = "주소를 찾지 못했습니다. 주소 검색으로 다시 선택해 주세요.";

export function FestivalRegisterForm() {
  const router = useRouter();
  const accountKind = useAdminAuthStore((state) => state.session?.admin.accountKind);
  const allowedToCreate = canCreateFestival(accountKind);

  useEffect(() => {
    if (!allowedToCreate) router.replace("/console");
  }, [allowedToCreate, router]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [locations, setLocations] = useState<LocationDraft[]>(() => createInitialLocationDrafts());
  const [primaryKey, setPrimaryKey] = useState(() => locations[0].key);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [festivalThumbnail, setFestivalThumbnail] = useState<File | null>(null);
  const [festivalThumbnailError, setFestivalThumbnailError] = useState<string | null>(null);

  const [festivalSearchOpen, setFestivalSearchOpen] = useState(false);
  const [festivalSearchState, setFestivalSearchState] = useState<SearchDialogState>("default");
  const [festivalSearchResults, setFestivalSearchResults] = useState<FestivalSeriesSearchResult[]>(
    [],
  );
  const [festivalSearchPending, setFestivalSearchPending] = useState(false);
  const [addressSearchTargetKey, setAddressSearchTargetKey] = useState<string | null>(null);
  const [addressSearchState, setAddressSearchState] = useState<SearchDialogState>("default");
  const [addressSearchResults, setAddressSearchResults] = useState<SearchDialogResult[]>([]);
  const [addressManualPending, setAddressManualPending] = useState(false);
  const [addressManualError, setAddressManualError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [geocodePending, setGeocodePending] = useState(false);
  const [addressErrorKeys, setAddressErrorKeys] = useState<string[]>([]);
  const [submitLocations, setSubmitLocations] = useState<LocationDraft[]>([]);
  const [periodTouched, setPeriodTouched] = useState({ startDate: false, endDate: false });

  const periodErrors = validateFestivalPeriod(startDate, endDate);
  const visiblePeriodErrors = {
    startDate: periodTouched.startDate ? periodErrors.startDate : null,
    endDate: periodTouched.endDate ? periodErrors.endDate : null,
  };
  const periodBlocksSubmit = hasFestivalPeriodError(visiblePeriodErrors);

  useKakaoMapLoader();

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

  async function applyFestivalSeries(series: FestivalSeriesSearchResult) {
    setName(series.name);
    setDescription(series.latestDescription ?? "");
    setStartDate(toDisplayDateOrEmpty(series.latestStartDate));
    setEndDate(toDisplayDateOrEmpty(series.latestEndDate));
    setFestivalSearchOpen(false);

    const roadAddress = series.latestAddress ?? "";
    const firstKey = locations[0]?.key;
    setLocations((current) => {
      const [first, ...rest] = current;
      return [
        {
          ...first,
          roadAddress,
          detailAddress: series.latestDetailAddress ?? "",
          latitude: undefined,
          longitude: undefined,
        },
        ...rest,
      ];
    });

    if (!roadAddress) return;
    const coordinate = await geocodeAddress(roadAddress);
    if (coordinate && firstKey) updateLocation(firstKey, coordinate);
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
          latitude: Number(item.y),
          longitude: Number(item.x),
        })),
      );
      setAddressSearchState("result");
    });
  }

  function updateLocation(key: string, patch: Partial<Omit<LocationDraft, "key">>) {
    setLocations((current) => current.map((loc) => (loc.key === key ? { ...loc, ...patch } : loc)));
    if (patch.latitude != null) setAddressErrorKeys((current) => current.filter((k) => k !== key));
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
    mutationFn: async (locationsToSubmit: LocationDraft[]) => {
      const request = {
        name,
        description,
        locations: toFestivalLocationRequests(locationsToSubmit, primaryKey),
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
        // 운영 시작/종료 시간은 이번 화면 디자인에 없어 임시 기본값을 보낸다.
        // 디자인에 운영시간 입력이 추가되면 이 기본값을 실제 입력값으로 교체해야 한다.
        operationStartTime: "09:00:00",
        operationEndTime: "18:00:00",
        // 화면설계서에 집계 방식 입력이 없어 화면에는 노출하지 않는다. 다만 보내지 않으면
        // 축제가 UNSET으로 만들어져 결과 리포트를 영영 만들 수 없으므로 기본값을 싣는다.
        visitorCountInputMode: "DAILY" as FestivalVisitorCountInputMode,
      };

      return festivalThumbnail
        ? createFestivalWithThumbnail(request, festivalThumbnail)
        : createFestival(request);
    },
    onSuccess: (festival) => {
      // 등록 직후 부스맵으로 넘어가므로, 이동한 화면에서 결과를 알 수 있게 토스트를 남긴다.
      toast.success("축제를 등록했습니다.", {
        description: "이어서 부스 위치를 찍어 주세요.",
      });
      router.push(`/console/festivals/${festival.festivalId}/boothmap?guide=1`);
    },
    onError: (error) => {
      setSubmitDialogOpen(false);
      toast.error(getApiErrorMessage(error, "축제를 등록하지 못했습니다."));
    },
  });

  function selectFestivalThumbnail(file: File) {
    if (!FESTIVAL_THUMBNAIL_MIME_TYPES.includes(file.type)) {
      setFestivalThumbnail(null);
      setFestivalThumbnailError("PNG 또는 JPG 이미지만 첨부할 수 있습니다.");
      return;
    }
    if (file.size > FESTIVAL_THUMBNAIL_MAX_BYTES) {
      setFestivalThumbnail(null);
      setFestivalThumbnailError("대표 썸네일은 50MB까지 첨부할 수 있습니다.");
      return;
    }
    setFestivalThumbnail(file);
    setFestivalThumbnailError(null);
  }

  async function handleSubmitClick() {
    if (name.trim().length === 0) {
      toast.error("축제명을 입력해 주세요.");
      return;
    }
    if (description.trim().length === 0) {
      toast.error("축제 설명을 입력해 주세요.");
      return;
    }
    if (hasFestivalPeriodError(periodErrors)) {
      setPeriodTouched({ startDate: true, endDate: true });
      toast.error("축제 기간을 확인해 주세요.");
      return;
    }
    if (isFestivalEnded(endDate)) {
      toast.error("이미 종료된 축제입니다.");
      return;
    }
    if (locations.some((location) => !isLocationDraftComplete(location))) {
      toast.error("모든 장소의 주소를 입력해 주세요.");
      return;
    }

    setAddressErrorKeys([]);
    setGeocodePending(true);
    let resolved: LocationDraft[];
    try {
      resolved = await Promise.all(
        locations.map(async (location) => {
          if (hasLocationDraftCoordinate(location)) return location;
          const coordinate = await geocodeAddress(location.roadAddress);
          return coordinate ? { ...location, ...coordinate } : location;
        }),
      );
    } finally {
      setGeocodePending(false);
    }
    setLocations(resolved);

    const unresolved = resolved.filter((location) => !hasLocationDraftCoordinate(location));
    if (unresolved.length > 0) {
      const names = unresolved.map((location) => location.locationName.trim() || "이름 없는 장소");
      setAddressErrorKeys(unresolved.map((location) => location.key));
      toast.error(`${names.join(", ")}의 ${ADDRESS_GEOCODE_FAILED_MESSAGE}`);
      return;
    }

    setSubmitLocations(resolved);
    setSubmitDialogOpen(true);
  }

  function handleConfirmRegistration() {
    if (isFestivalEnded(endDate)) {
      setSubmitDialogOpen(false);
      toast.error("이미 종료된 축제입니다.");
      return;
    }
    createMutation.mutate(submitLocations);
  }

  const addressSearchTarget = locations.find((loc) => loc.key === addressSearchTargetKey) ?? null;

  return (
    <div className="col-span-3 flex min-w-0 flex-col gap-6 pb-24">
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <FormSection label="축제 기본정보 입력">
            <Input
              layout="with-button"
              placeholder="축제명을 입력해 주세요"
              value={name}
              onChange={(event) => setName(event.target.value)}
              button={
                <Button
                  type="button"
                  onClick={() => {
                    setFestivalSearchState("default");
                    setFestivalSearchResults([]);
                    setFestivalSearchOpen(true);
                  }}
                >
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DateField
                label="시작날짜"
                wrapperClassName="min-w-0"
                value={startDate}
                errorText={visiblePeriodErrors.startDate ?? undefined}
                onChange={setStartDate}
                onBlur={() => setPeriodTouched((prev) => ({ ...prev, startDate: true }))}
              />
              <DateField
                label="종료날짜"
                wrapperClassName="min-w-0"
                value={endDate}
                errorText={visiblePeriodErrors.endDate ?? undefined}
                onChange={setEndDate}
                onBlur={() => setPeriodTouched((prev) => ({ ...prev, endDate: true }))}
              />
            </div>

            <FestivalLocationFields
              locations={locations}
              addressErrorKeys={addressErrorKeys}
              addressErrorMessage={ADDRESS_GEOCODE_FAILED_MESSAGE}
              onAdd={addLocation}
              onRemove={removeLocation}
              onChange={updateLocation}
              onSearchAddress={(key) => {
                setAddressSearchTargetKey(key);
                setAddressSearchState("default");
                setAddressManualError(null);
              }}
            />
          </FormSection>
        </div>

        <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-zinc-300 bg-white px-5 py-6 sm:px-8">
          <p className="body-large-bold text-zinc-950">축제 대표 썸네일 첨부</p>
          <AttachmentField
            file={festivalThumbnail}
            onSelect={selectFestivalThumbnail}
            onRemove={() => {
              setFestivalThumbnail(null);
              setFestivalThumbnailError(null);
            }}
            accept={FESTIVAL_THUMBNAIL_ACCEPT}
            description="사용자 화면에 표시할 대표 썸네일입니다. 부스 지도·AI 분석에는 사용하지 않으며 최소 해상도 제한이 없습니다. (PNG·JPG, 50MB 이하)"
            error={festivalThumbnailError}
            disabled={createMutation.isPending}
          />
        </section>
      </div>

      <Bottombar
        onCancel={() => setCancelDialogOpen(true)}
        onSubmit={handleSubmitClick}
        submitLabel={geocodePending ? "주소 확인 중..." : undefined}
        submitDisabled={geocodePending || periodBlocksSubmit}
      />

      <SearchDialog
        open={festivalSearchOpen}
        onOpenChange={(next) => {
          setFestivalSearchOpen(next);
          if (!next) setFestivalSearchState("default");
        }}
        title="축제 검색"
        placeholder="축제명을 입력해 주세요"
        helperText={FESTIVAL_SEARCH_HELPER_TEXT}
        helperItems={FESTIVAL_SEARCH_HELPER_ITEMS}
        state={festivalSearchState}
        results={festivalSearchResults.map(toFestivalSearchDialogResult)}
        searchPending={festivalSearchPending}
        onSearch={searchFestivals}
        noResultSubtext="하단의 직접 입력을 눌러 축제명을 등록해 주세요"
        onSelectResult={(result) => {
          const series = findFestivalSearchResult(festivalSearchResults, result.id);
          if (series) void applyFestivalSeries(series);
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
            setAddressManualError(null);
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
            updateLocation(addressSearchTargetKey, {
              roadAddress: result.label,
              latitude: result.latitude,
              longitude: result.longitude,
            });
          setAddressSearchTargetKey(null);
        }}
        manualInputPending={addressManualPending}
        manualInputError={addressManualError}
        onManualInput={async (value) => {
          const targetKey = addressSearchTargetKey;
          if (!targetKey) return;
          if (value.length === 0) {
            setAddressManualError("주소를 입력해 주세요.");
            return;
          }
          setAddressManualError(null);
          setAddressManualPending(true);
          try {
            const coordinate = await geocodeAddress(value);
            if (!coordinate) {
              setAddressManualError(ADDRESS_GEOCODE_FAILED_MESSAGE);
              return;
            }
            updateLocation(targetKey, { roadAddress: value, ...coordinate });
            setAddressSearchTargetKey(null);
          } finally {
            setAddressManualPending(false);
          }
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
        onConfirm={handleConfirmRegistration}
      />
    </div>
  );
}
