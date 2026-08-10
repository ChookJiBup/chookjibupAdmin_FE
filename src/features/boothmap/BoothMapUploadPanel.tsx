"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BoothMapEditor } from "./BoothMapEditor";
import { pollMapAnalysis } from "./analysisPolling";
import { clearCachedMapId, getCachedMapId, setCachedMapId } from "./mapIdCache";
import type { MapAnalysisStatusResponse } from "./types";

type PanelState =
  | { status: "no-map" }
  | { status: "polling"; mapId: string; progress: MapAnalysisStatusResponse | null }
  | { status: "ready"; mapId: string }
  | { status: "failed"; mapId: string; message: string };

const noSubscription = () => () => {};

/** 캐시된 mapId. SSR에서는 항상 null로 취급하고(하이드레이션 이후 클라이언트에서 다시 읽는다). */
function useCachedMapId(festivalId: string) {
  return useSyncExternalStore(
    noSubscription,
    () => getCachedMapId(festivalId),
    () => null,
  );
}

/**
 * `BoothMapEditPage`가 이 컴포넌트를 `key={festivalId}`로 렌더링하므로, 축제를
 * 바꿔 들어오면 컴포넌트가 통째로 다시 마운트되어 아래 로컬 상태(override)도 함께
 * 초기화된다 — festivalId 변화를 감지하는 별도 effect가 필요 없다.
 */
export function BoothMapUploadPanel({ festivalId }: { festivalId: string }) {
  const cachedMapId = useCachedMapId(festivalId);
  const [override, setOverride] = useState<PanelState | null>(null);
  const [manualMapId, setManualMapId] = useState("");

  const state: PanelState =
    override ??
    (cachedMapId
      ? { status: "polling", mapId: cachedMapId, progress: null }
      : { status: "no-map" });

  useEffect(() => {
    if (state.status !== "polling") return;
    const { mapId } = state;
    let cancelled = false;

    pollMapAnalysis(festivalId, mapId, (progress) => {
      if (!cancelled) setOverride({ status: "polling", mapId, progress });
    })
      .then((finalStatus) => {
        if (cancelled) return;
        if (finalStatus.status === "COMPLETED") {
          setOverride({ status: "ready", mapId });
        } else {
          setOverride({
            status: "failed",
            mapId,
            message: finalStatus.failureMessage ?? "배치도 분석에 실패했습니다.",
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOverride({
            status: "failed",
            mapId,
            message:
              error instanceof Error ? error.message : "배치도 분석 상태 확인에 실패했습니다.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status === "polling" ? state.mapId : null]);

  if (state.status === "no-map") {
    return (
      <div className="flex max-w-lg flex-col gap-3 rounded-lg border border-dashed border-zinc-300 p-4">
        <p className="body-regular text-zinc-500">
          이 축제에 등록된 배치도를 찾을 수 없습니다. 배치도는 &ldquo;새 축제 만들기&rdquo; 화면에서
          이미지를 첨부해야만 생성할 수 있어요(기존 축제에 나중에 배치도를 붙이는 기능은 아직
          백엔드에 없습니다).
        </p>
        <div className="flex flex-col gap-2">
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
              disabled={!manualMapId.trim()}
              onClick={() => {
                const mapId = manualMapId.trim();
                setCachedMapId(festivalId, mapId);
                setOverride({ status: "polling", mapId, progress: null });
              }}
            >
              열기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "polling") {
    const { progress } = state;
    return (
      <div className="flex flex-col gap-2">
        <p className="body-regular text-zinc-500">
          배치도 이미지를 분석하는 중입니다 (OpenAI가 도면을 인식해 부스/시설 후보를 만듭니다).
        </p>
        {progress ? (
          <p className="body-small text-zinc-400">
            상태: {progress.status} · 시도 {progress.attemptCount}회 · 인식 {progress.detectedCount}
            개
          </p>
        ) : null}
        <p className="body-caption text-zinc-400">시간이 걸릴 수 있습니다. 자동으로 갱신됩니다.</p>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="flex flex-col gap-2">
        <p className="body-small text-error">{state.message}</p>
        <p className="body-caption text-zinc-500">
          아래 편집기에서 이미지를 다시 교체해 재분석을 시도할 수 있습니다.
        </p>
        <BoothMapEditor
          festivalId={festivalId}
          mapId={state.mapId}
          onMapDeleted={() => {
            clearCachedMapId(festivalId);
            setOverride({ status: "no-map" });
          }}
          onImageReplaced={() =>
            setOverride({ status: "polling", mapId: state.mapId, progress: null })
          }
        />
      </div>
    );
  }

  return (
    <BoothMapEditor
      festivalId={festivalId}
      mapId={state.mapId}
      onMapDeleted={() => {
        clearCachedMapId(festivalId);
        setOverride({ status: "no-map" });
      }}
      onImageReplaced={() => setOverride({ status: "polling", mapId: state.mapId, progress: null })}
    />
  );
}
