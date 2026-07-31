"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { boothMapDraftStorageKey, BoothMapEditor } from "./BoothMapEditor";
import { mockUploadAndProcess } from "./mockPipeline";
import type { BoothMapUploadState } from "./types";

const noSubscription = () => () => {};

/** 이 축제의 로컬 부스맵 초안이 저장돼 있는지. SSR에서는 항상 false로 취급한다. */
function useHasSavedDraft(festivalId: string) {
  return useSyncExternalStore(
    noSubscription,
    () => window.localStorage.getItem(boothMapDraftStorageKey(festivalId)) !== null,
    () => false,
  );
}

export function BoothMapUploadPanel({ festivalId }: { festivalId: string }) {
  const [state, setState] = useState<BoothMapUploadState>({ status: "idle" });
  const [draftDismissed, setDraftDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 저장된 로컬 초안이 있으면 다시 업로드하지 않고 바로 편집기를 연다.
  // (배치도 이미지는 blob URL이라 새로고침하면 살아있지 않아 배경 없이 연다.)
  const hasSavedDraft = useHasSavedDraft(festivalId);
  const effectiveState: BoothMapUploadState =
    state.status === "idle" && hasSavedDraft && !draftDismissed
      ? { status: "done", objects: [] }
      : state;

  function handleFileSelected(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setState({ status: "selected", file, previewUrl });
  }

  async function handleUpload() {
    if (state.status !== "selected") return;
    const { file, previewUrl } = state;

    setState({ status: "uploading", file, previewUrl });
    // TODO: 실제로는 업로드(1단계) 완료 응답을 받은 뒤 처리 상태를 별도로 조회해야 한다.
    setState({ status: "processing", previewUrl });
    try {
      const objects = await mockUploadAndProcess();
      setState({ status: "done", previewUrl, objects });
    } catch {
      setState({ status: "error", message: "이미지 처리 중 오류가 발생했습니다." });
    }
  }

  function reset() {
    setState({ status: "idle" });
    setDraftDismissed(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      {effectiveState.status === "idle" && (
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) handleFileSelected(file);
          }}
          className="flex h-48 w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-zinc-500"
        >
          <span className="body-regular">배치도 이미지를 드래그하거나 클릭해서 업로드</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />
        </label>
      )}

      {effectiveState.status === "selected" && (
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={effectiveState.previewUrl}
            alt="배치도 미리보기"
            className="max-h-64 max-w-lg rounded-lg border object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUpload}
              className="body-regular-bold rounded-lg border px-4 py-2"
            >
              업로드
            </button>
            <button
              type="button"
              onClick={reset}
              className="body-regular rounded-lg border px-4 py-2"
            >
              다시 선택
            </button>
          </div>
        </div>
      )}

      {effectiveState.status === "uploading" && (
        <p className="body-regular text-zinc-500">업로드 중...</p>
      )}

      {effectiveState.status === "processing" && (
        <div className="flex flex-col gap-2">
          <p className="body-regular text-zinc-500">
            이미지를 분석하는 중입니다 (보정 → 텍스트 인식 → 영역 추출 → 시설 분류)
          </p>
          <p className="body-small text-zinc-400">처리에는 시간이 걸릴 수 있습니다.</p>
        </div>
      )}

      {effectiveState.status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="body-small text-error">{effectiveState.message}</p>
          <button
            type="button"
            onClick={reset}
            className="body-regular w-fit rounded-lg border px-4 py-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {effectiveState.status === "done" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="body-regular text-zinc-500">
              자동 배치 결과입니다. 아래에서 자유롭게 옮기고 수정해 보세요.
            </p>
            <button
              type="button"
              onClick={reset}
              className="body-small shrink-0 rounded-lg border px-3 py-1.5 text-zinc-950"
            >
              다시 업로드
            </button>
          </div>
          <BoothMapEditor
            festivalId={festivalId}
            previewUrl={effectiveState.previewUrl}
            initialObjects={effectiveState.objects}
          />
        </div>
      )}
    </div>
  );
}
