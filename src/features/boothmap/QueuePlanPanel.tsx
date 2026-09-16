"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QueuePointEditor } from "./QueuePointEditor";
import { getApiErrorMessage } from "@/lib/api/httpError";
import type { QueuePathPoint } from "@/features/staffMap/types";
import {
  getQueueCandidates,
  getQueuePlan,
  getQueueRecommendationStatus,
  recommendQueuePlan,
  saveQueuePlan,
} from "./queuePlanApi";

export interface QueuePlanPanelProps {
  festivalId: string;
  boothId: number;
  boothName: string;
  entry?: "manual" | "ai";
  nodeVersion: number | undefined;
  boundaryAvailable: boolean;
  path: QueuePathPoint[];
  onPathChange: (path: QueuePathPoint[]) => void;
  onClose: () => void;
  locked: boolean;
  onBusyChange: (busy: boolean) => void;
}

export function QueuePlanPanel({
  festivalId,
  boothId,
  boothName,
  entry = "manual",
  nodeVersion,
  boundaryAvailable,
  path,
  onPathChange,
  onClose,
  locked,
  onBusyChange,
}: QueuePlanPanelProps) {
  const client = useQueryClient();
  const key = ["booth-queue-plan", festivalId, boothId];
  const plan = useQuery({
    queryKey: key,
    queryFn: () => getQueuePlan(festivalId, boothId),
    retry: false,
  });
  const candidates = useQuery({
    queryKey: [...key, "candidates"],
    queryFn: () => getQueueCandidates(festivalId, boothId),
    retry: false,
  });
  const aiStatus = useQuery({
    queryKey: [...key, "ai-status"],
    queryFn: () => getQueueRecommendationStatus(festivalId, boothId),
    retry: false,
  });
  const pathInitialized = useRef(false);
  useEffect(() => {
    if (!plan.isSuccess || pathInitialized.current) return;
    pathInitialized.current = true;
    if (plan.data && path.length <= 1) onPathChange(plan.data.path);
  }, [plan.isSuccess, plan.data, path, onPathChange]);
  const [spacing, setSpacing] = useState(1);
  const [speed, setSpeed] = useState(2);
  const [capacity, setCapacity] = useState(40);
  const [revision, setRevision] = useState(0);
  const [version, setVersion] = useState(nodeVersion);
  const [source, setSource] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      onBusyChange(false);
    };
  }, [onBusyChange]);
  if (plan.isSuccess && !initialized) {
    setInitialized(true);
    setRevision(plan.data?.revision ?? 0);
    setSpacing(plan.data?.metersPerPerson ?? 1);
    setSpeed(plan.data?.servedPersonsPerMinute ?? 2);
    setSource(plan.data?.sourceNodeId ?? null);
  }
  const handleError = (cause: unknown) => {
    if (!mounted.current) return;
    if (isAxiosError(cause) && cause.response?.status === 409) {
      setConflict(true);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      setError("다른 수정이 반영되었습니다. 최신 경로를 불러오거나 도구를 다시 열어 주세요.");
    } else setError(getApiErrorMessage(cause, "사전 줄 설정을 처리하지 못했습니다."));
  };
  const recommendation = useMutation({
    onMutate: () => onBusyChange(true),
    onSettled: () => {
      if (mounted.current) onBusyChange(false);
    },
    mutationFn: () => recommendQueuePlan(festivalId, boothId, capacity, spacing),
    onSuccess: (result) => {
      if (!mounted.current) return;
      onPathChange(result.path);
      setRevision(result.expectedRevision);
      setVersion(result.expectedNodeVersion);
      setSource(null);
      setReason(result.reason);
      setWarnings(result.warnings);
      setError(null);
    },
    onError: handleError,
  });
  const save = useMutation({
    onMutate: () => onBusyChange(true),
    onSettled: () => {
      if (mounted.current) onBusyChange(false);
    },
    mutationFn: () => {
      if (version == null) throw new Error("지도 버전이 없습니다. 지도를 다시 불러와 주세요.");
      return saveQueuePlan(festivalId, boothId, {
        path,
        metersPerPerson: spacing,
        servedPersonsPerMinute: speed,
        sourceNodeId: source,
        expectedRevision: revision,
        expectedNodeVersion: version,
      });
    },
    onSuccess: (result) => {
      client.setQueryData(key, result);
      if (!mounted.current) return;
      toast.success("사전 줄을 설정했습니다. 현재 대기시간은 관측 후 계산됩니다.");
      onClose();
    },
    onError: handleError,
  });
  const busy = save.isPending || recommendation.isPending;
  const validPath = path.every(
    (p) =>
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng) &&
      Math.abs(p.lat) <= 90 &&
      Math.abs(p.lng) <= 180,
  );
  const validSettings =
    Number.isFinite(spacing) &&
    spacing >= 0.2 &&
    spacing <= 5 &&
    Number.isFinite(speed) &&
    speed >= 0.1 &&
    speed <= 100;
  const unavailable =
    locked || busy || plan.isPending || plan.isError || version == null || conflict;
  const settingsLocked = busy || locked || plan.isPending || plan.isError;
  return (
    <section aria-label="사전 줄 설정" className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="body-small-bold text-zinc-950">{boothName} · 사전 줄 설정</p>
          <p className="body-caption text-zinc-500">
            {entry === "ai"
              ? "간격·처리 인원·목표 수용 인원을 확인하고 AI 추천을 요청하세요. 추천 경로는 확인 후 확정합니다."
              : "지도에서 꺾이는 지점을 클릭하세요. 점선은 사전 경로이며 현재 대기시간을 바꾸지 않습니다."}
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          닫기
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          label="대기자 간격(m)"
          type="number"
          min={0.2}
          max={5}
          step={0.1}
          value={Number.isNaN(spacing) ? "" : spacing}
          disabled={settingsLocked}
          onChange={(e) => setSpacing(e.target.valueAsNumber)}
        />
        <Input
          label="분당 처리 인원(전체 창구 합계)"
          type="number"
          min={0.1}
          max={100}
          step={0.1}
          value={Number.isNaN(speed) ? "" : speed}
          disabled={settingsLocked}
          onChange={(e) => setSpeed(e.target.valueAsNumber)}
        />
        <Input
          label="AI 목표 수용 인원(명)"
          type="number"
          min={1}
          max={1000}
          step={1}
          value={Number.isNaN(capacity) ? "" : capacity}
          disabled={settingsLocked}
          onChange={(e) => setCapacity(e.target.valueAsNumber)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={
            unavailable ||
            !aiStatus.data?.available ||
            !boundaryAvailable ||
            !validSettings ||
            !Number.isInteger(capacity) ||
            capacity < 1 ||
            capacity > 1000
          }
          onClick={() => {
            setError(null);
            recommendation.mutate();
          }}
        >
          {recommendation.isPending ? "AI 추천 중…" : "AI로 사전 줄 추천"}
        </Button>
        <Button
          disabled={
            unavailable || !validSettings || !validPath || path.length < 2 || path.length > 500
          }
          onClick={() => {
            setError(null);
            save.mutate();
          }}
        >
          {save.isPending ? "저장 중…" : "사전 줄 확정"}
        </Button>
        <Button
          variant="outline"
          disabled={busy || !plan.data || locked || plan.isFetching}
          onClick={() => {
            if (!plan.data) return;
            onPathChange(plan.data.path);
            setSpacing(plan.data.metersPerPerson);
            setSpeed(plan.data.servedPersonsPerMinute);
            setRevision(plan.data.revision);
            setVersion(plan.data.nodeVersion);
            setSource(plan.data.sourceNodeId);
            setReason(null);
            setWarnings([]);
            setConflict(false);
            setError(null);
          }}
        >
          저장된 경로 불러오기
        </Button>
        <Button
          variant="ghost"
          disabled={busy || locked || path.length <= 1}
          onClick={() => onPathChange(path.slice(0, -1))}
        >
          마지막 점 취소
        </Button>
      </div>
      <p className="body-caption text-zinc-500">
        {plan.data
          ? `저장된 사전 줄 ${Math.round(plan.data.lengthMeters)}m · 약 ${plan.data.estimatedCapacity}명 수용`
          : plan.isSuccess
            ? "아직 설정된 사전 줄이 없습니다."
            : "사전 설정 조회 중…"}{" "}
        · 초안 {path.length}개 지점
      </p>
      {aiStatus.isPending ? (
        <p className="body-caption text-zinc-500">AI 사용 가능 여부 확인 중…</p>
      ) : aiStatus.isError ? (
        <p role="alert" className="body-caption text-error">
          AI 상태를 확인하지 못했습니다. BE 업데이트와 서버 연결을 확인해 주세요.
        </p>
      ) : !aiStatus.data?.available ? (
        <p role="status" className="body-caption text-point-600">
          {aiStatus.data?.reason ?? "서버에서 AI 줄 추천을 사용할 수 없습니다."}
        </p>
      ) : null}
      <QueuePointEditor
        path={path}
        fixedStart
        locked={settingsLocked || conflict}
        onChange={(points) => {
          setSource(null);
          onPathChange(points);
        }}
      />
      {!boundaryAvailable ? (
        <p className="body-caption text-point-600">
          AI 추천은 지도에 행사장 경계를 저장한 뒤 사용할 수 있습니다.
        </p>
      ) : null}
      {nodeVersion == null ? (
        <p className="body-caption text-error">
          지도 버전이 없습니다. BE 업데이트 후 지도를 다시 불러와 주세요.
        </p>
      ) : null}
      {candidates.data?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="body-caption text-zinc-500">도면 대기선</span>
          {candidates.data.map((candidate) => (
            <Button
              key={candidate.sourceNodeId}
              variant="outline"
              size="sm"
              disabled={unavailable}
              onClick={() => {
                onPathChange(candidate.path);
                setSource(candidate.sourceNodeId);
                setRevision(candidate.expectedRevision);
                setVersion(candidate.expectedNodeVersion);
                setReason(null);
                setWarnings([]);
              }}
            >
              {candidate.name} {candidate.source === "AI" ? "(AI 인식)" : ""}
            </Button>
          ))}
        </div>
      ) : null}
      {reason ? <p className="body-small text-zinc-950">추천 이유: {reason}</p> : null}
      {warnings.map((warning) => (
        <p key={warning} className="body-caption text-point-600">
          {warning}
        </p>
      ))}
      {recommendation.isPending ? (
        <p role="status" className="body-caption text-zinc-500">
          추천에는 최대 2분이 걸릴 수 있습니다. 완료 후 경로를 확인하고 확정해 주세요.
        </p>
      ) : null}
      {error || plan.isError || candidates.isError ? (
        <p role="alert" className="body-caption text-error">
          {error ??
            getApiErrorMessage(
              plan.error ?? candidates.error,
              "설정이나 도면 후보를 불러오지 못했습니다.",
            )}
        </p>
      ) : null}
    </section>
  );
}
