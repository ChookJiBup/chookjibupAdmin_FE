"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QueuePointEditor } from "./QueuePointEditor";
import { queueSegmentLength } from "./queueSnap";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/api/httpError";
import type { QueuePathPoint } from "@/features/staffMap/types";
import {
  getQueueCandidates,
  getQueuePlan,
  getQueueRecommendationStatus,
  recommendQueuePlan,
  saveQueuePlan,
  deleteQueuePlan,
} from "./queuePlanApi";

export interface QueuePlanPanelProps {
  festivalId: string;
  boothId: number;
  boothName: string;
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
    if (plan.data && plan.data.path.length >= 2 && path.length <= 1) onPathChange(plan.data.path);
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteQueuePlan(festivalId, boothId, revision, version!),
    onMutate: () => onBusyChange(true),
    onSettled: () => onBusyChange(false),
    onSuccess: (result) => {
      client.setQueryData(key, result);
      void client.invalidateQueries({ queryKey: ["festival-queues", festivalId] });
      void client.invalidateQueries({ queryKey: ["festival-dashboard", festivalId] });
      onClose();
      toast.success("사전 줄 경로를 삭제했습니다.");
    },
    onError: (cause) => handleError(cause),
  });
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
  const busy = save.isPending || recommendation.isPending || remove.isPending;
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
  const draftLength = path.reduce(
    (total, point, index) => (index === 0 ? 0 : total + queueSegmentLength(path[index - 1], point)),
    0,
  );
  const draftCapacity = validSettings && validPath ? Math.floor(draftLength / spacing) : null;
  const savedPlan = plan.data && plan.data.path.length >= 2 ? plan.data : null;
  const aiUnavailableReason = aiStatus.isError
    ? "AI 상태를 확인하지 못했습니다. BE 업데이트와 서버 연결을 확인해 주세요."
    : aiStatus.data && !aiStatus.data.available
      ? (aiStatus.data.reason ?? "서버에서 AI 줄 추천을 사용할 수 없습니다.")
      : null;
  return (
    <section aria-label="사전 줄 설정" className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="body-small text-zinc-950">
          <span className="body-small-bold">{boothName}</span> · 지도를 눌러 줄이 꺾이는 지점을
          찍으세요
          <span className="body-small-bold ml-2 text-primary">
            지점 {path.length}개
            {path.length >= 2
              ? ` · ${Math.round(draftLength)}m${draftCapacity != null ? ` · 약 ${draftCapacity}명` : ""}`
              : ""}
          </span>
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            disabled={busy || locked || path.length <= 1}
            onClick={() => onPathChange(path.slice(0, -1))}
          >
            한 점 취소
          </Button>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            그만두기
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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-200 pt-3">
        <Input
          layout="label-left"
          label="대기자 간격(m)"
          type="number"
          min={0.2}
          max={5}
          step={0.1}
          className="w-20"
          value={Number.isNaN(spacing) ? "" : spacing}
          disabled={settingsLocked}
          onChange={(e) => setSpacing(e.target.valueAsNumber)}
        />
        <Input
          layout="label-left"
          label="분당 처리 인원"
          title="전체 창구 합계"
          type="number"
          min={0.1}
          max={100}
          step={0.1}
          className="w-20"
          value={Number.isNaN(speed) ? "" : speed}
          disabled={settingsLocked}
          onChange={(e) => setSpeed(e.target.valueAsNumber)}
        />
        <span aria-hidden className="h-5 w-px bg-zinc-200" />
        <Input
          layout="label-left"
          label="AI 목표 인원"
          type="number"
          min={1}
          max={1000}
          step={1}
          className="w-20"
          value={Number.isNaN(capacity) ? "" : capacity}
          disabled={settingsLocked}
          onChange={(e) => setCapacity(e.target.valueAsNumber)}
        />
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
          {recommendation.isPending ? "AI 추천 중…" : "AI 추천"}
        </Button>
        {candidates.data?.map((candidate) => (
          <Button
            key={candidate.sourceNodeId}
            variant="outline"
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
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            selected={showCoordinates}
            aria-expanded={showCoordinates}
            onClick={() => setShowCoordinates(!showCoordinates)}
          >
            좌표 직접 입력
          </Button>
          {savedPlan ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy || locked || plan.isFetching}
              onClick={() => {
                onPathChange(savedPlan.path);
                setSpacing(savedPlan.metersPerPerson);
                setSpeed(savedPlan.servedPersonsPerMinute);
                setRevision(savedPlan.revision);
                setVersion(savedPlan.nodeVersion);
                setSource(savedPlan.sourceNodeId);
                setReason(null);
                setWarnings([]);
                setConflict(false);
                setError(null);
              }}
            >
              저장된 경로 불러오기
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={settingsLocked || path.length <= 1}
            onClick={() => {
              setSource(null);
              onPathChange(path.slice(0, 1));
            }}
          >
            초안 지우기
          </Button>
          {savedPlan ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-error"
              disabled={unavailable}
              onClick={() => setDeleteOpen(true)}
            >
              사전 경로 삭제
            </Button>
          ) : null}
        </div>
      </div>

      {showCoordinates ? (
        <QueuePointEditor
          path={path}
          fixedStart
          locked={settingsLocked || conflict}
          onChange={(points) => {
            setSource(null);
            onPathChange(points);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-1 empty:hidden">
        <p className="body-caption text-zinc-500">
          {savedPlan
            ? `저장된 사전 줄 ${Math.round(savedPlan.lengthMeters)}m · 약 ${savedPlan.estimatedCapacity}명 수용`
            : plan.isSuccess
              ? "아직 설정된 사전 줄이 없습니다. 점선은 사전 경로이며 현재 대기시간을 바꾸지 않습니다."
              : "사전 설정 조회 중…"}
        </p>
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
        ) : aiUnavailableReason ? (
          <p role="status" className="body-caption text-point-600">
            {aiUnavailableReason}
          </p>
        ) : !boundaryAvailable ? (
          <p className="body-caption text-point-600">
            AI 추천은 지도에 행사장 경계를 저장한 뒤 사용할 수 있습니다.
          </p>
        ) : null}
        {nodeVersion == null ? (
          <p className="body-caption text-error">
            지도 버전이 없습니다. BE 업데이트 후 지도를 다시 불러와 주세요.
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
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="사전 줄 경로를 삭제하시겠습니까?"
        description="현재 줄 위치와 대기시간도 초기화됩니다. 새 경로를 설정한 뒤 현재 줄을 다시 기록해 주세요."
        confirmLabel="경로 삭제"
        confirmVariant="destructive"
        onConfirm={() => {
          setDeleteOpen(false);
          remove.mutate();
        }}
      />
    </section>
  );
}
