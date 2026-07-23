"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { mockUploadAndProcess } from "./mockPipeline";
import type { BoothMapUploadState } from "./types";

// Konva는 canvas(window)에 의존해 SSR에서 렌더링할 수 없다.
// (react-konva named export를 각각 dynamic import하면 Turbopack에서
// "Cannot use 'in' operator to search for 'default' in Layer" 에러가 나서,
// 캔버스 전체를 하나의 컴포넌트로 묶어 통째로 dynamic import한다.)
const BoothMapCanvas = dynamic(() => import("./BoothMapCanvas"), { ssr: false });

export function BoothMapUploadPanel() {
  const [state, setState] = useState<BoothMapUploadState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      {state.status === "idle" && (
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) handleFileSelected(file);
          }}
          className="flex h-48 w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-gray-500"
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

      {state.status === "selected" && (
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.previewUrl}
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

      {state.status === "uploading" && <p className="body-regular text-gray-500">업로드 중...</p>}

      {state.status === "processing" && (
        <div className="flex flex-col gap-2">
          <p className="body-regular text-gray-500">
            이미지를 분석하는 중입니다 (보정 → 텍스트 인식 → 영역 추출 → 시설 분류)
          </p>
          <p className="body-small text-gray-400">처리에는 시간이 걸릴 수 있습니다.</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col gap-2">
          <p className="body-small text-error">{state.message}</p>
          <button
            type="button"
            onClick={reset}
            className="body-regular w-fit rounded-lg border px-4 py-2"
          >
            다시 시도
          </button>
        </div>
      )}

      {state.status === "done" && (
        <div className="flex flex-col gap-3">
          <p className="body-regular text-gray-500">
            자동 배치 결과입니다. 아래에서 위치를 확인하고 수정할 수 있습니다. (드래그 이동/저장은
            아직 미구현)
          </p>
          <div className="w-fit rounded-lg border">
            <BoothMapCanvas objects={state.objects} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className="body-regular-bold rounded-lg border px-4 py-2 opacity-50"
            >
              저장 (미구현)
            </button>
            <button
              type="button"
              onClick={reset}
              className="body-regular rounded-lg border px-4 py-2"
            >
              다시 업로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
