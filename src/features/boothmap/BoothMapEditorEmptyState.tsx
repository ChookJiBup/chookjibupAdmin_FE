"use client";

import { useEffect, useRef, useState } from "react";
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
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { FESTIVAL_MAP_CENTER } from "@/features/dashboard/mockData";
import { useConsoleUiStore } from "@/store/consoleUiStore";

/**
 * Figma "4-2. 축제부스지도 - 등록된 파일이 없는 경우" 화면.
 * 배치도 캔버스/실행취소·다시실행/파일 업로드/핀·폴리곤·라인 도구는 편집 대상
 * 배치도가 없으면 의미가 없어 비활성 처리한다 — 특히 "파일 업로드"는
 * 기존 축제에 배치도를 나중에 붙이는 API가 아직 백엔드에 없어서(항상) 비활성이다
 * ([[project-boothmap-backend-gap]]).
 */
export function BoothMapEditorEmptyState({ festivalId }: { festivalId: string }) {
  const router = useRouter();
  const setHideNav = useConsoleUiStore((state) => state.setHideNav);
  const setFullBleed = useConsoleUiStore((state) => state.setFullBleed);
  const [zoomStep, setZoomStep] = useState(0);
  const [mapLoading, mapError] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "",
  });
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  useEffect(() => {
    setHideNav(true);
    setFullBleed(true);
    return () => {
      setHideNav(false);
      setFullBleed(false);
    };
  }, [setHideNav, setFullBleed]);

  useEffect(() => {
    const id = toast("축제부스지도 수정", {
      description: "우측 리스트/지도상의 핀/모달을 선택해 상세 정보를 편집할 수 있습니다.",
      duration: Infinity,
    });
    return () => {
      toast.dismiss(id);
    };
  }, []);

  // React의 합성 onWheel은 passive 리스너로 등록돼 preventDefault가 무시된다 —
  // 트랙패드 핀치(ctrl+wheel로 인식됨)가 카카오맵을 그대로 통과해 브라우저 자체
  // 페이지 확대로 새는 걸 막으려면 네이티브 리스너를 non-passive로 직접 달아야 한다.
  useEffect(() => {
    const wrapper = mapWrapperRef.current;
    if (!wrapper) return;
    const handleWheel = (event: WheelEvent) => event.preventDefault();
    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-300">
      {process.env.NEXT_PUBLIC_KAKAO_MAP_KEY && !mapError && !mapLoading ? (
        <div ref={mapWrapperRef} className="absolute inset-0 isolate">
          <Map
            center={FESTIVAL_MAP_CENTER}
            level={4 + zoomStep}
            scrollwheel={false}
            className="h-full w-full"
            onCreate={(map) => {
              map.setMinLevel(2);
              map.setMaxLevel(8);
            }}
          />
        </div>
      ) : null}

      <div className="absolute top-10 bottom-10 left-8 flex items-start gap-5">
        <div className="flex h-full w-72 flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-300 bg-white p-6">
          <p className="body-large-bold text-zinc-950">축제부스</p>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="flex flex-col gap-2 rounded-md bg-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-200"
          >
            <p className="body-small-bold text-zinc-950">업로드된 파일이 없습니다.</p>
            <p className="body-caption text-zinc-950">
              축제부스지도 파일을 업로드하거나 부스를 추가해 축제부스지도를 만들어 보세요.
            </p>
          </button>
        </div>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            toast.error("아직 업로드할 수 없어요", {
              description: "기존 축제에 배치도를 새로 붙이는 업로드 API가 아직 백엔드에 없습니다.",
            });
          }
          if (uploadInputRef.current) uploadInputRef.current.value = "";
        }}
      />

      <div className="absolute top-10 right-8 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span title="편집 내용이 없어 실행취소할 수 없습니다.">
            <IconButton
              icon={<ResetIcon className="size-5" />}
              aria-label="실행취소"
              disabled
              className="text-zinc-500"
            />
          </span>
          <span title="편집 내용이 없어 다시실행할 수 없습니다.">
            <IconButton
              icon={<ResetIcon className="size-5 -scale-x-100" />}
              aria-label="다시실행"
              disabled
              className="text-zinc-500"
            />
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            icon={<FileIcon />}
            onClick={() => uploadInputRef.current?.click()}
          >
            파일 업로드
          </Button>
          <Button type="button" variant="primary" onClick={() => setSaveDialogOpen(true)}>
            저장하기
          </Button>
        </div>
        <IconButton
          icon={<Cross2Icon className="size-5" />}
          aria-label="닫기"
          className="text-zinc-950"
          onClick={() => setCloseDialogOpen(true)}
        />
      </div>

      <div className="absolute right-8 bottom-10 flex flex-col items-center gap-5">
        <div className="flex flex-col gap-1">
          <span title="배치도가 없어 핀을 추가할 수 없습니다.">
            <IconButton
              icon={<RadiobuttonIcon className="size-5" />}
              aria-label="핀 추가"
              disabled
              className="text-zinc-950"
            />
          </span>
          <span title="배치도가 없어 폴리곤을 추가할 수 없습니다.">
            <IconButton
              icon={<DimensionsIcon className="size-5" />}
              aria-label="폴리곤 추가"
              disabled
              className="text-zinc-950"
            />
          </span>
          <span title="배치도가 없어 라인을 추가할 수 없습니다.">
            <IconButton
              icon={<RulerHorizontalIcon className="size-5" />}
              aria-label="라인 추가"
              disabled
              className="text-zinc-950"
            />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <IconButton
            icon={<PlusIcon className="size-5" />}
            aria-label="확대"
            className="text-zinc-950"
            onClick={() => setZoomStep((step) => Math.max(step - 1, -2))}
          />
          <IconButton
            icon={<MinusIcon className="size-5" />}
            aria-label="축소"
            className="text-zinc-950"
            onClick={() => setZoomStep((step) => Math.min(step + 1, 4))}
          />
        </div>
      </div>

      <ConfirmDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        title="저장하시겠습니까?"
        confirmLabel="저장"
        confirmVariant="primary"
        onConfirm={() => {
          setSaveDialogOpen(false);
          toast.info("저장할 내용이 없습니다", {
            description: "배치도를 업로드하거나 부스를 추가한 뒤 다시 시도해 주세요.",
          });
        }}
      />
      <ConfirmDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        title="나가시겠습니까?"
        description="저장하지 않은 내용은 사라집니다."
        confirmLabel="나가기"
        confirmVariant="destructive"
        onConfirm={() => router.push(`/console/festivals/${festivalId}`)}
      />
    </div>
  );
}
