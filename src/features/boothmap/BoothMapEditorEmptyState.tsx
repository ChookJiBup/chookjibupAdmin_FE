"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Map, useKakaoLoader } from "react-kakao-maps-sdk";
import {
  Cross2Icon,
  DimensionsIcon,
  FileIcon,
  MinusIcon,
  PlusIcon,
  RadiobuttonIcon,
  ResetIcon,
  RulerHorizontalIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { FESTIVAL_MAP_CENTER } from "@/features/dashboard/mockData";
import { useConsoleUiStore } from "@/store/consoleUiStore";
import { BoothMapGuideBanner } from "./BoothMapGuideBanner";
import { setCachedMapId } from "./mapIdCache";

/**
 * Figma "4-2. 축제부스지도 - 등록된 파일이 없는 경우" 화면.
 * 배치도 캔버스/실행취소·다시실행/파일 업로드/핀·폴리곤·라인 도구는 편집 대상
 * 배치도가 없으면 의미가 없어 비활성 처리한다 — 특히 "파일 업로드"는
 * 기존 축제에 배치도를 나중에 붙이는 API가 아직 백엔드에 없어서(항상) 비활성이다.
 * mapId를 이미 알고 있는 경우를 위한 수동 입력만 동작한다([[project-boothmap-backend-gap]]).
 */
export function BoothMapEditorEmptyState({
  festivalId,
  onOpenMap,
}: {
  festivalId: string;
  onOpenMap: (mapId: string) => void;
}) {
  const router = useRouter();
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const [zoomStep, setZoomStep] = useState(0);
  const [manualMapId, setManualMapId] = useState("");
  const [mapLoading, mapError] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });

  useEffect(() => {
    setHideNav(true);
    setFullBleed(true);
    return () => {
      setHideNav(false);
      setFullBleed(false);
    };
  }, [setHideNav, setFullBleed]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-300">
      {process.env.NEXT_PUBLIC_KAKAO_MAP_KEY && !mapError && !mapLoading ? (
        <Map
          center={FESTIVAL_MAP_CENTER}
          level={4 + zoomStep}
          scrollwheel={false}
          className="absolute inset-0 isolate"
          onCreate={(map) => {
            map.setMinLevel(2);
            map.setMaxLevel(8);
          }}
        />
      ) : null}

      <div className="absolute top-3 bottom-3 left-3 flex items-start gap-3">
        <div className="flex h-full w-72 flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-300 bg-white p-6">
          <p className="body-large-bold text-zinc-950">축제부스</p>
          <div className="flex flex-col gap-2 rounded-md bg-zinc-100 px-4 py-3">
            <p className="body-small-bold text-zinc-950">자동 매핑 결과입니다.</p>
            <p className="body-caption text-zinc-950">
              이미지 분석으로 축제 구역과 시설을 추출했어요. 수정이 필요한 항목을 선택하세요.
            </p>
            <div className="mt-2 flex flex-col gap-2 border-t border-zinc-200 pt-2">
              <p className="body-caption text-zinc-500">
                이미 배치도를 만들었고 mapId를 알고 있다면 직접 입력해서 열 수 있어요(임시 방편).
              </p>
              <div className="flex gap-2">
                <Input
                  wrapperClassName="flex-1"
                  placeholder="mapId(UUID)"
                  value={manualMapId}
                  onChange={(event) => setManualMapId(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!manualMapId.trim()}
                  onClick={() => {
                    const mapId = manualMapId.trim();
                    setCachedMapId(festivalId, mapId);
                    onOpenMap(mapId);
                  }}
                >
                  열기
                </Button>
              </div>
            </div>
          </div>
        </div>

        <BoothMapGuideBanner />
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span title="편집 내용이 없어 실행취소할 수 없습니다.">
            <IconButton icon={<ResetIcon />} aria-label="실행취소" disabled />
          </span>
          <span title="편집 내용이 없어 다시실행할 수 없습니다.">
            <IconButton
              icon={<ResetIcon className="-scale-y-100" />}
              aria-label="다시실행"
              disabled
            />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span title="기존 축제에 배치도를 나중에 붙이는 업로드 API가 아직 백엔드에 없습니다.">
            <Button type="button" variant="outline" icon={<FileIcon />} disabled>
              파일 업로드
            </Button>
          </span>
          <span title="편집 내용이 없어 저장할 수 없습니다.">
            <Button type="button" variant="primary" disabled>
              저장하기
            </Button>
          </span>
        </div>
        <IconButton
          icon={<Cross2Icon />}
          aria-label="닫기"
          onClick={() => router.push(`/console/festivals/${festivalId}`)}
        />
      </div>

      <div className="absolute top-1/2 right-3 flex -translate-y-1/2 flex-col items-center gap-8">
        <div className="flex flex-col gap-1">
          <span title="배치도가 없어 핀을 추가할 수 없습니다.">
            <IconButton icon={<RadiobuttonIcon />} aria-label="핀 추가" disabled />
          </span>
          <span title="배치도가 없어 폴리곤을 추가할 수 없습니다.">
            <IconButton icon={<DimensionsIcon />} aria-label="폴리곤 추가" disabled />
          </span>
          <span title="배치도가 없어 라인을 추가할 수 없습니다.">
            <IconButton icon={<RulerHorizontalIcon />} aria-label="라인 추가" disabled />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <IconButton
            icon={<PlusIcon />}
            aria-label="확대"
            onClick={() => setZoomStep((step) => Math.max(step - 1, -2))}
          />
          <IconButton
            icon={<MinusIcon />}
            aria-label="축소"
            onClick={() => setZoomStep((step) => Math.min(step + 1, 4))}
          />
        </div>
      </div>
    </div>
  );
}
