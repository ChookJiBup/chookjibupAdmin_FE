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
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { setCachedMapId } from "@/features/boothmap/mapIdCache";
import { createFestival, createFestivalWithMap } from "@/features/festivals/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import {
  createInitialLocationDrafts,
  createLocationDraft,
  isLocationDraftComplete,
  toFestivalLocationRequests,
  type LocationDraft,
} from "./locationDraft";
import { SearchDialog, type SearchDialogState } from "./SearchDialog";
import { FESTIVAL_LOCATION_TYPE_LABEL, type FestivalLocationType } from "./types";

const DATE_DISPLAY_PATTERN = /^\d{4}\.\d{2}\.\d{2}$/;
const LOCATION_TYPE_OPTIONS = Object.entries(FESTIVAL_LOCATION_TYPE_LABEL) as [
  FestivalLocationType,
  string,
][];

/** "YYYY.mm.dd" 화면 표기를 API가 요구하는 "yyyy-MM-dd"로 변환한다. */
function toIsoDate(displayDate: string) {
  return displayDate.replaceAll(".", "-");
}

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  const [addressSearchTargetKey, setAddressSearchTargetKey] = useState<string | null>(null);
  const [addressSearchState, setAddressSearchState] = useState<SearchDialogState>("default");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  function updateLocation(key: string, patch: Partial<Omit<LocationDraft, "key">>) {
    setLocations((current) => current.map((loc) => (loc.key === key ? { ...loc, ...patch } : loc)));
  }

  function addLocation() {
    setLocations((current) => [...current, createLocationDraft()]);
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
    <div className="flex w-2/3 flex-col gap-6">
      <FormSection label="축제 기본정보 입력">
        <Input
          layout="with-button"
          placeholder="축제명을 입력해 주세요"
          value={name}
          onChange={(event) => setName(event.target.value)}
          button={
            <Button type="button" onClick={() => setFestivalSearchOpen(true)}>
              기본정보 불러오기
            </Button>
          }
        />
        <Textarea
          placeholder="축제 설명을 작성해 주세요"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="rounded-lg border-zinc-400 bg-white body-regular! text-zinc-950 placeholder:text-zinc-400 focus-visible:border-primary focus-visible:ring-0"
        />
      </FormSection>

      <FormSection label="축제 장소 입력">
        <div className="flex flex-col gap-4">
          {locations.map((location, index) => (
            <div
              key={location.key}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <p className="body-small-bold text-zinc-950">장소 {index + 1}</p>
                  <label className="flex items-center gap-1.5">
                    <Checkbox
                      checked={location.key === primaryKey}
                      onCheckedChange={(checked) => {
                        if (checked) setPrimaryKey(location.key);
                      }}
                    />
                    <span className="body-caption text-zinc-500">대표 장소</span>
                  </label>
                </div>
                {locations.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<TrashIcon />}
                    onClick={() => removeLocation(location.key)}
                  >
                    삭제
                  </Button>
                ) : null}
              </div>

              <div className="flex gap-3">
                <Select
                  value={location.locationType}
                  onValueChange={(value) =>
                    updateLocation(location.key, { locationType: value as FestivalLocationType })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPE_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  wrapperClassName="flex-1"
                  placeholder="장소 이름(예: 메인 무대)"
                  value={location.locationName}
                  onChange={(event) =>
                    updateLocation(location.key, { locationName: event.target.value })
                  }
                />
              </div>

              {location.roadAddress ? (
                <Input disabled value={location.roadAddress} />
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

          <Button type="button" variant="outline" icon={<PlusIcon />} onClick={addLocation}>
            장소 추가
          </Button>
        </div>

        <div className="flex gap-3">
          <Input
            label="시작날짜"
            wrapperClassName="flex-1"
            placeholder="YYYY.mm.dd"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="종료날짜"
            wrapperClassName="flex-1"
            placeholder="YYYY.mm.dd"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
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

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setCancelDialogOpen(true)}>
          취소하기
        </Button>
        <Button type="button" onClick={handleSubmitClick}>
          등록하기
        </Button>
      </div>

      <SearchDialog
        open={festivalSearchOpen}
        onOpenChange={(next) => {
          setFestivalSearchOpen(next);
          if (!next) setFestivalSearchState("default");
        }}
        title="축제 검색"
        placeholder="검색어를 입력해 주세요"
        helperText="축제명으로 검색하면 이전 축제 정보를 불러올 수 있어요."
        helperItems={["도로명 + 건물번호(예: 세계로 10)"]}
        state={festivalSearchState}
        // 이전 축제 정보를 불러오는 검색 API가 아직 없어 검색하면 항상 결과 없음으로 처리한다.
        onSearch={() => setFestivalSearchState("none")}
        noResultSubtext="이전 축제 정보를 불러오는 기능은 아직 준비 중입니다."
        onSelectResult={() => {}}
        onManualInput={() => setFestivalSearchOpen(false)}
        manualInputLabel="닫기"
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
        // 주소 검색 API가 아직 없어 검색하면 항상 결과 없음으로 처리하고, 직접 입력으로 유도한다.
        onSearch={() => setAddressSearchState("none")}
        noResultSubtext="주소 검색 기능은 아직 준비 중입니다. 직접 입력해 주세요."
        onSelectResult={() => {}}
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
        confirmLabel="취소"
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
