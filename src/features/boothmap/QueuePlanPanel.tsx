"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Cross2Icon, InfoCircledIcon, RulerHorizontalIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { queueSegmentLength } from "./queueSnap";
import { getApiErrorMessage } from "@/lib/api/httpError";
import type { QueuePathPoint } from "@/features/staffMap/types";
import {
  getQueuePlan,
  getQueueRecommendationStatus,
  recommendQueuePlan,
  saveQueuePlan,
} from "./queuePlanApi";

export interface QueuePlanPanelProps {
  festivalId: string;
  boothId: number;
  boothName: string;
  nodeVersion: number | undefined;
  boundaryAvailable: boolean;
  entry: "ai" | "manual";
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
  entry,
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
  const aiStatus = useQuery({
    queryKey: [...key, "ai-status"],
    queryFn: () => getQueueRecommendationStatus(festivalId, boothId),
    enabled: entry === "ai",
    retry: false,
  });
  const pathInitialized = useRef(false);
  useEffect(() => {
    if (entry === "manual" || !plan.isSuccess || pathInitialized.current) return;
    pathInitialized.current = true;
    if (plan.data && plan.data.path.length >= 2 && path.length <= 1) onPathChange(plan.data.path);
  }, [entry, plan.isSuccess, plan.data, path, onPathChange]);
  const [spacing, setSpacing] = useState(1);
  const [speed, setSpeed] = useState(2);
  const capacity = 40;
  const [revision, setRevision] = useState(0);
  const [version, setVersion] = useState(nodeVersion);
  const [source, setSource] = useState<string | null>(null);
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
      setWarnings(result.warnings);
      setError(null);
    },
    onError: handleError,
  });
  const requestedAutomatically = useRef(false);
  useEffect(() => {
    if (
      entry !== "ai" ||
      requestedAutomatically.current ||
      !aiStatus.data?.available ||
      !boundaryAvailable ||
      locked ||
      plan.isPending ||
      plan.isError ||
      version == null
    )
      return;
    requestedAutomatically.current = true;
    recommendation.mutate();
  }, [
    entry,
    aiStatus.data?.available,
    boundaryAvailable,
    locked,
    plan.isPending,
    plan.isError,
    version,
    recommendation,
  ]);
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
  if (entry === "manual") {
    return (
      <section aria-label="사전 줄 설정" className="relative flex w-full flex-col gap-4">
        <IconButton
          icon={<Cross2Icon />}
          aria-label="그만두기"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0"
          onClick={onClose}
        />
        <div className="flex items-start gap-3 pr-10">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RulerHorizontalIcon className="size-5" />
          </span>
          <div>
            <p className="body-regular-bold text-zinc-950">{boothName} 대기줄</p>
            <p className="body-small mt-1 text-zinc-500">
              지도에서 줄이 꺾이는 지점을 순서대로 찍어 주세요.
            </p>
          </div>
        </div>
        <p className="body-caption w-fit rounded-md bg-primary/10 px-2 py-1 text-primary">
          찍은 지점 {Math.max(0, path.length - 1)}개
        </p>
        <div className="flex gap-3 rounded-lg bg-primary/5 p-4">
          <InfoCircledIcon className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="body-small-bold text-zinc-950">지도에서 대기줄 경로를 그려 주세요</p>
            <p className="body-small mt-1 text-zinc-500">
              부스에서 시작해 꺾이는 지점을 차례로 찍으세요. 마지막 지점이 줄끝입니다.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 px-4 py-3">
          <p className="body-small-bold text-zinc-950">
            {savedPlan ? "현재 저장된 대기줄" : "저장된 대기줄 없음"}
          </p>
          {savedPlan ? (
            <>
              <span className="body-small text-zinc-500">
                총 {Math.round(savedPlan.lengthMeters)}m
              </span>
              <span className="body-small text-zinc-500">
                약 {savedPlan.estimatedCapacity}명 수용
              </span>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
          <Button
            variant="outline"
            disabled={busy || locked || path.length <= 1}
            onClick={() => onPathChange(path.slice(0, -1))}
          >
            마지막 점 지우기
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <p className="body-caption text-zinc-500">
              {path.length >= 2
                ? `선택한 줄 ${Math.round(draftLength)}m · 약 ${draftCapacity ?? 0}명`
                : "줄끝을 선택하면 저장할 수 있습니다."}
            </p>
            <Button
              disabled={
                unavailable || !validSettings || !validPath || path.length < 2 || path.length > 500
              }
              onClick={() => {
                setError(null);
                save.mutate();
              }}
            >
              {save.isPending ? "저장 중…" : "대기줄 저장"}
            </Button>
          </div>
        </div>
        {error || plan.isError ? (
          <p role="alert" className="body-caption text-error">
            {error ?? getApiErrorMessage(plan.error, "대기줄을 불러오지 못했습니다.")}
          </p>
        ) : null}
      </section>
    );
  }
  return (
    <section aria-label="사전 줄 설정" className="relative flex w-full flex-col gap-5">
      <IconButton
        icon={<Cross2Icon />}
        aria-label="그만두기"
        title="그만두기"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0"
        onClick={onClose}
      />
      <div className="flex items-start gap-3 pr-10">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <RulerHorizontalIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="body-regular-bold text-zinc-950">{boothName} 대기줄</p>
          <p className="body-small mt-1 text-zinc-500">
            AI 추천 경로를 확인하고 필요하면 지도에서 점을 옮기세요.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-zinc-200 rounded-lg bg-primary/5 py-3">
        <div className="px-3 text-center">
          <p className="body-caption text-zinc-500">지점</p>
          <p className="body-small-bold mt-1 text-primary">{path.length}개</p>
        </div>
        <div className="px-3 text-center">
          <p className="body-caption text-zinc-500">총 길이</p>
          <p className="body-small-bold mt-1 text-primary">{Math.round(draftLength)}m</p>
        </div>
        <div className="px-3 text-center">
          <p className="body-caption text-zinc-500">예상 수용</p>
          <p className="body-small-bold mt-1 text-primary">약 {draftCapacity ?? 0}명</p>
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4">
        <p className="body-small-bold text-zinc-950">경로 설정</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {entry === "ai" ? (
            <Button
              variant="outline"
              disabled={
                unavailable || !aiStatus.data?.available || !boundaryAvailable || !validSettings
              }
              onClick={() => {
                setError(null);
                recommendation.mutate();
              }}
            >
              {recommendation.isPending ? "AI 추천 중…" : "AI 추천"}
            </Button>
          ) : null}
          <Button
            disabled={
              unavailable || !validSettings || !validPath || path.length < 2 || path.length > 500
            }
            onClick={() => {
              setError(null);
              save.mutate();
            }}
          >
            {save.isPending ? "저장 중…" : "대기줄 저장"}
          </Button>
        </div>
      </div>

      <div className="flex gap-3 rounded-lg bg-zinc-50 p-4">
        <InfoCircledIcon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="body-small-bold text-zinc-950">
            {savedPlan ? "저장된 대기줄이 있습니다" : "대기줄이 아직 설정되지 않았어요"}
          </p>
          <p className="body-caption text-zinc-500">
            {savedPlan
              ? `저장된 경로 ${Math.round(savedPlan.lengthMeters)}m · 약 ${savedPlan.estimatedCapacity}명 수용`
              : plan.isSuccess
                ? "저장하면 현장 운영에서 존별로 줄끝을 갱신할 수 있습니다."
                : "대기줄 조회 중…"}
          </p>
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
          {error || plan.isError ? (
            <p role="alert" className="body-caption text-error">
              {error ?? getApiErrorMessage(plan.error, "사전 줄 설정을 불러오지 못했습니다.")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
