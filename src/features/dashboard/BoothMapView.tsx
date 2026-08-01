"use client";

import { Map, MapMarker, CustomOverlayMap, useKakaoLoader } from "react-kakao-maps-sdk";
import { Cross2Icon, ReloadIcon } from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui/IconButton";
import { CongestionBadge } from "@/components/ui/CongestionBadge";
import { StaffBadge, OperatorBadge } from "@/components/ui/RoleBadge";
import { FESTIVAL_MAP_CENTER } from "./mockData";
import type { Booth } from "./types";

const CONGESTION_MARKER_COLOR: Record<Booth["congestionLevel"], string> = {
  LOW: "#52525c",
  MEDIUM: "#fd7e14",
  HIGH: "#e7000b",
};

function markerImageSrc(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5.5" fill="white"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function BoothPopup({ booth, onClose }: { booth: Booth; onClose: () => void }) {
  return (
    <div className="mb-3 w-64 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="body-regular-bold text-zinc-950">{booth.name}</p>
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="닫기"
          icon={<Cross2Icon />}
          onClick={onClose}
          className="-mr-1"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="body-small text-zinc-500">실시간 혼잡도정보</p>
        <div className="flex items-center gap-1 text-zinc-400">
          <span className="body-caption">{booth.updatedMinutesAgo}분 전</span>
          <ReloadIcon className="size-3.5" />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="body-small text-zinc-500">혼잡도</p>
        <CongestionBadge level={booth.congestionLevel} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="body-small text-zinc-500">마지막 줄끝갱신자</p>
        <div className="flex items-center gap-1">
          <span className="body-small text-zinc-950">{booth.lastQueueUpdater.name}</span>
          {booth.lastQueueUpdater.role === "STAFF" ? <StaffBadge /> : <OperatorBadge />}
        </div>
      </div>
    </div>
  );
}

export function BoothMapView({
  booths,
  selectedBooth,
  onSelectBooth,
  zoomStep = 0,
}: {
  booths: Booth[];
  selectedBooth: Booth | null;
  onSelectBooth: (booth: Booth | null) => void;
  /** 기본 확대 수준(4)에 대한 상대값. 낮을수록 확대된다. */
  zoomStep?: number;
}) {
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });

  if (!process.env.NEXT_PUBLIC_KAKAO_MAP_KEY) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
        <p className="body-small text-zinc-500">
          NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
        <p className="body-small text-error">카카오맵을 불러오지 못했습니다.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
        <p className="body-small text-zinc-500">지도를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <Map
      center={FESTIVAL_MAP_CENTER}
      level={4 + zoomStep}
      minLevel={2}
      maxLevel={8}
      scrollwheel={false}
      className="h-full w-full"
    >
      {booths.map((booth) => (
        <MapMarker
          key={booth.boothId}
          position={{ lat: booth.lat, lng: booth.lng }}
          image={{
            src: markerImageSrc(CONGESTION_MARKER_COLOR[booth.congestionLevel]),
            size: { width: 28, height: 36 },
          }}
          onClick={() => onSelectBooth(booth)}
        />
      ))}

      {selectedBooth ? (
        <CustomOverlayMap
          position={{ lat: selectedBooth.lat, lng: selectedBooth.lng }}
          yAnchor={1}
          zIndex={10}
        >
          <BoothPopup booth={selectedBooth} onClose={() => onSelectBooth(null)} />
        </CustomOverlayMap>
      ) : null}
    </Map>
  );
}
