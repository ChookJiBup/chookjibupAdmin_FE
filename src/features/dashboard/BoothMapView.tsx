"use client";

import { Map, CustomOverlayMap, Polyline, useKakaoLoader } from "react-kakao-maps-sdk";
import { Cross2Icon, UpdateIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { CongestionText } from "@/components/ui/CongestionBadge";
import { StaffBadge, OperatorBadge } from "@/components/ui/RoleBadge";
import { FESTIVAL_MAP_CENTER } from "./mockData";
import type { AiSuggestion, Booth } from "./types";

/** 지도 마커 위에 뜨는 부스 상세정보 말풍선. 아래쪽 중앙에서 마커를 향해 뾰족한 꼬리가 이어진다. */
function BoothPopup({ booth, onClose }: { booth: Booth; onClose: () => void }) {
  const [updatedMinutesAgo, setUpdatedMinutesAgo] = useState(booth.updatedMinutesAgo);

  return (
    <div className="mb-2.5 flex flex-col items-center">
      <div className="w-72 rounded-2xl bg-white p-5">
        <div className="relative flex items-center justify-center border-b border-zinc-200 pb-3">
          <p className="body-large-bold text-center text-zinc-950">{booth.name}</p>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="닫기"
            icon={<Cross2Icon />}
            onClick={onClose}
            className="absolute right-0"
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="body-caption text-zinc-500">실시간 혼잡도정보</p>
          <Button
            variant="ghost"
            size="sm"
            icon={<UpdateIcon className="size-3 text-zinc-950" />}
            className="body-caption text-zinc-500 hover:text-zinc-600"
            onClick={() => setUpdatedMinutesAgo(0)}
          >
            {updatedMinutesAgo === 0 ? "방금 전" : `${updatedMinutesAgo}분 전`}
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="body-small text-zinc-950">혼잡도</p>
          <CongestionText level={booth.congestionLevel} />
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="body-small text-zinc-950">마지막 줄끝갱신자</p>
          <div className="flex items-center gap-1.5">
            <span className="body-small-bold text-zinc-950">{booth.lastQueueUpdater.name}</span>
            {booth.lastQueueUpdater.role === "STAFF" ? <StaffBadge /> : <OperatorBadge />}
          </div>
        </div>
      </div>
      <div className="-mt-2.5 size-5 rotate-45 bg-white" />
    </div>
  );
}

export function BoothMapView({
  booths,
  selectedBooth,
  onSelectBooth,
  zoomStep = 0,
  suggestions = [],
  center = FESTIVAL_MAP_CENTER,
}: {
  booths: Booth[];
  selectedBooth: Booth | null;
  onSelectBooth: (booth: Booth | null) => void;
  /** 기본 확대 수준(4)에 대한 상대값. 낮을수록 확대된다. */
  zoomStep?: number;
  /** 경로선(path)이 있는 AI 제안을 지도 위에 함께 그린다. */
  suggestions?: AiSuggestion[];
  center?: { lat: number; lng: number };
}) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div className="absolute inset-0 isolate flex items-center justify-center border border-zinc-200 bg-zinc-50">
        <p className="body-small text-zinc-500">NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 isolate flex items-center justify-center border border-zinc-200 bg-zinc-50">
        <p className="body-small text-error">카카오맵을 불러오지 못했습니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 isolate flex items-center justify-center border border-zinc-200 bg-zinc-50">
        <p className="body-small text-zinc-500">지도를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <Map
      center={center}
      isPanto={false}
      level={4 + zoomStep}
      scrollwheel={false}
      className="absolute inset-0 isolate"
      // react-kakao-maps-sdk의 minLevel/maxLevel prop은 내부적으로 서로 뒤바뀐 채
      // kakao.maps.Map.setMinLevel/setMaxLevel에 전달되는 버그가 있어(v1.2.1),
      // onCreate에서 직접 정확한 인자로 호출한다.
      onCreate={(map) => {
        map.setMinLevel(2);
        map.setMaxLevel(8);
      }}
    >
      {suggestions.map((suggestion) =>
        suggestion.path ? (
          <Polyline
            key={suggestion.id}
            path={suggestion.path}
            strokeWeight={4}
            strokeColor="#18181b"
            strokeOpacity={0.9}
            strokeStyle="solid"
            endArrow
          />
        ) : null,
      )}

      {booths.map((booth) => {
        const isSelected = selectedBooth?.boothId === booth.boothId;
        return (
          <CustomOverlayMap
            key={booth.boothId}
            position={{ lat: booth.lat, lng: booth.lng }}
            clickable
            zIndex={isSelected ? 20 : 10}
          >
            <button
              type="button"
              title={booth.name}
              aria-label={booth.name}
              onClick={(event) => {
                event.stopPropagation();
                onSelectBooth(isSelected ? null : booth);
              }}
              className="flex size-3 items-center justify-center"
            >
              {isSelected ? (
                <span className="flex size-3 items-center justify-center rounded-full bg-point-300">
                  <span className="size-1 rounded-full bg-point-600" />
                </span>
              ) : (
                <span className="size-3 rounded-full bg-point-600 shadow-sm" />
              )}
            </button>
          </CustomOverlayMap>
        );
      })}

      {selectedBooth ? (
        <CustomOverlayMap
          position={{ lat: selectedBooth.lat, lng: selectedBooth.lng }}
          yAnchor={1}
          zIndex={30}
        >
          <BoothPopup booth={selectedBooth} onClose={() => onSelectBooth(null)} />
        </CustomOverlayMap>
      ) : null}
    </Map>
  );
}
