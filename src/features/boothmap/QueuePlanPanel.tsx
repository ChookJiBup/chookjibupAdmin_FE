"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { ChevronDownIcon, ChevronUpIcon, Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { queueSegmentLength } from "./queueSnap";
import { polylineWithinPolygon } from "./polygonGeometry";
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
  boundary: QueuePathPoint[] | null;
  entry: "ai" | "manual";
  path: QueuePathPoint[];
  onPathChange: (path: QueuePathPoint[]) => void;
  onClose: () => void;
  locked: boolean;
  onBusyChange: (busy: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export function QueuePlanPanel({
  festivalId,
  boothId,
  boothName,
  nodeVersion,
  boundaryAvailable,
  boundary,
  entry,
  path,
  onPathChange,
  onClose,
  locked,
  onBusyChange,
  onExpandedChange,
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
  const [conflict, setConflict] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [recommendationState, setRecommendationState] = useState<"idle" | "pending" | "complete">(
    "idle",
  );
  useEffect(() => {
    onExpandedChange?.(expanded);
    return () => onExpandedChange?.(false);
  }, [expanded, onExpandedChange]);
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
      const message = "다른 수정이 반영되었습니다. 최신 경로를 불러오거나 도구를 다시 열어 주세요.";
      setConflict(true);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ["map-editor", festivalId] });
      toast.error(message);
    } else {
      const message = getApiErrorMessage(cause, "사전 줄 설정을 처리하지 못했습니다.");
      toast.error(message);
    }
  };
  const recommendation = useMutation({
    onMutate: () => {
      setRecommendationState("pending");
      onBusyChange(true);
    },
    onSettled: () => {
      if (mounted.current) {
        onBusyChange(false);
      }
    },
    mutationFn: () => recommendQueuePlan(festivalId, boothId, capacity, spacing),
    onSuccess: (result) => {
      if (!mounted.current) return;
      if (!boundary || !polylineWithinPolygon(boundary, result.path)) {
        setRecommendationState("idle");
        toast.error("AI 추천 경로가 부지 경계 밖으로 나가 적용하지 않았습니다.");
        return;
      }
      onPathChange(result.path);
      setRecommendationState("complete");
      onBusyChange(false);
      setRevision(result.expectedRevision);
      setVersion(result.expectedNodeVersion);
      setSource(null);
      if (result.warnings.length > 0) {
        toast.warning("AI 추천 경로를 확인해 주세요.", {
          description: result.warnings.join(" "),
        });
      }
    },
    onError: (cause) => {
      setRecommendationState("idle");
      handleError(cause);
    },
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
      if (!boundary || !polylineWithinPolygon(boundary, path)) {
        throw new Error("대기줄은 부지 경계 안에만 저장할 수 있습니다.");
      }
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
  const recommendationPending = recommendationState === "pending";
  const busy = save.isPending || recommendationPending;
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
  useEffect(() => {
    if (plan.isError) toast.error(getApiErrorMessage(plan.error, "대기줄을 불러오지 못했습니다."));
  }, [plan.error, plan.isError]);
  useEffect(() => {
    if (nodeVersion == null) toast.error("지도 버전이 없습니다. 지도를 다시 불러와 주세요.");
  }, [nodeVersion]);
  const guideMessage = recommendationPending
    ? "대기줄 경로를 추천하고 있어요."
    : recommendationState === "complete"
      ? "추천 경로를 확인하고, 필요하면 점을 끌어 수정하세요."
      : "지도를 클릭해 지점을 추가하고, 점을 끌어 위치를 수정하세요.";
  if (entry === "manual" && !expanded) {
    return (
      <section aria-label="사전 줄 설정" className="relative w-full">
        <p className="body-caption absolute bottom-full left-1/2 mb-5 -translate-x-1/2 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-600 shadow-sm">
          {guideMessage}
        </p>
        <div className="flex min-w-0 items-center gap-2 pr-9">
          <p className="body-regular-bold min-w-24 flex-1 truncate text-center text-zinc-950">
            {boothName}
          </p>
          <span className="mx-1 h-5 w-px shrink-0 bg-zinc-200" />
          <p className="body-small shrink-0 text-zinc-500">
            총 길이 <span className="body-regular-bold ml-1 text-primary">{Math.round(draftLength)}m</span>
          </p>
          <Button
            variant="outline"
            className="ml-2 px-3"
            disabled={busy || locked || path.length <= 1}
            onClick={() => onPathChange(path.slice(0, -1))}
          >
            마지막 점 취소
          </Button>
          <Button
            type="button"
            variant="outline"
            icon={<ChevronUpIcon />}
            className="border-primary/30 px-3 text-primary hover:bg-primary/5 [&>span]:size-5 [&>span>svg]:size-5"
            onClick={() => setExpanded(true)}
          >
            펼치기
          </Button>
          <Button
            className="px-3"
            disabled={
              unavailable || !validSettings || !validPath || path.length < 2 || path.length > 500
            }
            onClick={() => {
              save.mutate();
            }}
          >
            {save.isPending ? "저장 중…" : "대기줄 저장"}
          </Button>
          <IconButton
            icon={<Cross2Icon />}
            iconClassName="size-5 [&_svg]:size-5"
            aria-label="그만두기"
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-0 -translate-y-1/2"
            onClick={onClose}
          />
        </div>
      </section>
    );
  }
  if (!expanded) {
    return (
      <section aria-label="사전 줄 설정" className="relative w-full">
        <p className="body-caption absolute bottom-full left-1/2 mb-5 -translate-x-1/2 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-zinc-600 shadow-sm">
          {guideMessage}
        </p>
        <div className="flex min-w-0 items-center gap-2 pr-9">
          <p className="body-regular-bold min-w-24 flex-1 truncate text-center text-zinc-950">
            {boothName}
          </p>
          <span className="mx-1 h-5 w-px shrink-0 bg-zinc-200" />
          <p className="body-small shrink-0 text-zinc-500">
            총 길이 <span className="body-regular-bold ml-1 text-primary">{Math.round(draftLength)}m</span>
          </p>
          <Button
            variant="outline"
            className="ml-2 px-3"
            disabled={busy || locked || path.length <= 1}
            onClick={() => onPathChange(path.slice(0, -1))}
          >
            마지막 점 취소
          </Button>
          <Button
            type="button"
            variant="outline"
            icon={<ChevronUpIcon />}
            className="border-primary/30 px-3 text-primary hover:bg-primary/5 [&>span]:size-5 [&>span>svg]:size-5"
            onClick={() => setExpanded(true)}
          >
            펼치기
          </Button>
          <Button
            className="px-3"
            disabled={
              unavailable || !validSettings || !validPath || path.length < 2 || path.length > 500
            }
            onClick={() => {
              save.mutate();
            }}
          >
            {save.isPending ? "저장 중…" : "대기줄 저장"}
          </Button>
          <IconButton
            icon={<Cross2Icon />}
            iconClassName="size-5 [&_svg]:size-5"
            aria-label="그만두기"
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-0 -translate-y-1/2"
            onClick={onClose}
          />
        </div>
      </section>
    );
  }
  return (
    <section aria-label="사전 줄 설정" className="relative flex w-full flex-col gap-3 text-center">
      <div className="absolute top-0 right-0 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<ChevronDownIcon />}
          className="px-2 text-primary hover:bg-primary/5"
          onClick={() => setExpanded(false)}
        >
          접기
        </Button>
        <IconButton
          icon={<Cross2Icon />}
          iconClassName="size-5 [&_svg]:size-5"
          aria-label="그만두기"
          title="그만두기"
          variant="ghost"
          size="sm"
          onClick={onClose}
        />
      </div>
      <div className="px-16">
        <div className="min-w-0">
          <p className="body-large-bold text-zinc-950">{boothName}</p>
          <p className="body-small mt-1 whitespace-nowrap text-zinc-500">
            {guideMessage}
          </p>
        </div>
      </div>
      <div className="mx-auto grid w-[88%] grid-cols-3 divide-x divide-zinc-200 rounded-lg bg-primary/5 py-3">
        <div className="px-3 text-center">
          <p className="body-small text-zinc-500">지점</p>
          <p className="body-regular-bold mt-1 text-primary">{Math.max(0, path.length - 1)}개</p>
        </div>
        <div className="px-3 text-center">
          <p className="body-small text-zinc-500">총 길이</p>
          <p className="body-regular-bold mt-1 text-primary">{Math.round(draftLength)}m</p>
        </div>
        <div className="px-3 text-center">
          <p className="body-small text-zinc-500">예상 수용</p>
          <p className="body-regular-bold mt-1 text-primary">약 {draftCapacity ?? 0}명</p>
        </div>
      </div>

      {entry === "ai" && !boundaryAvailable ? (
        <div className="flex justify-center gap-2 rounded-lg bg-secondary-300/20 px-3 py-2 text-secondary-600">
          <InfoCircledIcon className="mt-0.5 size-4 shrink-0" />
          <p className="body-caption">AI 추천을 사용하려면 경계를 먼저 저장하세요.</p>
        </div>
      ) : null}

      <p className="body-caption flex items-center justify-center gap-1.5 text-zinc-500">
        <InfoCircledIcon className="size-3.5 shrink-0 text-primary" />
        저장 후 현장 운영에서 줄 끝을 갱신할 수 있어요.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button
          variant="outline"
          className="min-w-28"
          disabled={busy || locked || path.length <= 1}
          onClick={() => onPathChange(path.slice(0, -1))}
        >
          마지막 점 취소
        </Button>
        <Button
          variant="outline"
          className="min-w-28"
          disabled={
            unavailable || !aiStatus.data?.available || !boundaryAvailable || !validSettings
          }
          onClick={() => {
            recommendation.mutate();
          }}
        >
          {recommendationPending
            ? "AI 추천 중…"
            : recommendationState === "complete"
              ? "다시 추천"
              : "AI 추천"}
        </Button>
        <Button
          className="min-w-28"
          disabled={
            unavailable || !validSettings || !validPath || path.length < 2 || path.length > 500
          }
          onClick={() => {
            save.mutate();
          }}
        >
          {save.isPending ? "저장 중…" : "대기줄 저장"}
        </Button>
      </div>
    </section>
  );
}
