"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CornersIcon, GroupIcon, InfoCircledIcon, RadiobuttonIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const SPOTLIGHT_GAP = 8;

interface GuideStep {
  title: string;
  description: string[];
  target?: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "부스 지도를 만들어 보세요",
    description: ["지도에서 부스와 시설을 추가하고,", "위치와 구역을 편집할 수 있습니다."],
  },
  {
    title: "지도에 직접 그리기",
    description: ["부지 경계를 먼저 그려 저장하고,", "저장한 경계 안에 부스와 시설을 추가합니다."],
    target: '[data-boothmap-guide="drawing-tools"]',
  },
  {
    title: "AI로 배치도 활용하기",
    description: ["팜플렛 이미지를 등록하면 지도에 표시하고,", "AI가 부스 위치를 함께 분석합니다."],
    target: '[data-boothmap-guide="ai-analysis"]',
  },
  {
    title: "부스를 선택해 편집하기",
    description: [
      "하나는 수정·삭제·대기줄 설정을,",
      "여러 개는 줄 세우기·구역 배정·그룹화를 사용할 수 있습니다.",
    ],
    target: '[data-boothmap-guide="booth-editing"]',
  },
  {
    title: "저장하고 공개하기",
    description: ["편집 내용을 저장하고,", "방문객에게 공개할지 설정합니다."],
    target: '[data-boothmap-guide="save-publish"]',
  },
];

const DRAW_TOOL_GUIDE_ITEMS = [
  { label: "부지 경계", icon: CornersIcon },
  { label: "핀 추가", icon: RadiobuttonIcon },
  { label: "범위 선택", icon: GroupIcon },
] as const;

interface SpotlightRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface BoothMapOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function findSpotlight(target?: string): SpotlightRect | null {
  if (!target) return null;
  const element = document.querySelector<HTMLElement>(target);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const left = Math.max(8, rect.left - SPOTLIGHT_GAP);
  const top = Math.max(8, rect.top - SPOTLIGHT_GAP);
  const right = Math.min(window.innerWidth - 8, rect.right + SPOTLIGHT_GAP);
  const bottom = Math.min(window.innerHeight - 8, rect.bottom + SPOTLIGHT_GAP);
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}

export function BoothMapOnboarding({ open, onOpenChange }: BoothMapOnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const step = GUIDE_STEPS[stepIndex];
  const closeGuide = useCallback(() => {
    setStepIndex(0);
    onOpenChange(false);
  }, [onOpenChange]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setSpotlight(findSpotlight(step.target));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new ResizeObserver(update);
    const target = step.target ? document.querySelector(step.target) : null;
    if (target) observer.observe(target);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [open, step.target]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeGuide();
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const [first] = focusable;
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [closeGuide, open]);

  if (!open || typeof document === "undefined") return null;

  const finish = closeGuide;
  const cardWidth = Math.min(384, window.innerWidth - 32);
  const cardStyle = spotlight
    ? spotlight.bottom + 480 < window.innerHeight
      ? {
          top: spotlight.bottom + 16,
          left: Math.max(16, Math.min(spotlight.left, window.innerWidth - cardWidth - 16)),
        }
      : spotlight.top >= 480
        ? {
            bottom: window.innerHeight - spotlight.top + 16,
            left: Math.max(16, Math.min(spotlight.left, window.innerWidth - cardWidth - 16)),
          }
        : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return createPortal(
    <div className="fixed inset-0 z-[100]" onMouseDown={(event) => event.preventDefault()}>
      {spotlight ? (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 bg-zinc-950/60"
            style={{ height: spotlight.top }}
          />
          <div
            className="pointer-events-none fixed left-0 bg-zinc-950/60"
            style={{ top: spotlight.top, width: spotlight.left, height: spotlight.height }}
          />
          <div
            className="pointer-events-none fixed right-0 bg-zinc-950/60"
            style={{
              top: spotlight.top,
              width: window.innerWidth - spotlight.right,
              height: spotlight.height,
            }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 bg-zinc-950/60"
            style={{ top: spotlight.bottom }}
          />
          <div
            className="pointer-events-none fixed rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-white/80"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-zinc-950/60" />
      )}

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booth-map-guide-title"
        aria-describedby="booth-map-guide-description"
        tabIndex={-1}
        className="fixed max-h-[calc(100%-32px)] w-[calc(100%-32px)] max-w-sm overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-xl outline-none sm:p-5"
        style={cardStyle}
      >
        <div className="relative flex min-h-8 items-center justify-center">
          <div
            className="flex items-center justify-center gap-2"
            role="img"
            aria-label={`${GUIDE_STEPS.length}단계 중 ${stepIndex + 1}단계`}
          >
            {GUIDE_STEPS.map((guideStep, index) => (
              <span
                key={guideStep.title}
                aria-hidden="true"
                className={cn(
                  "block size-2 rounded-full bg-zinc-300 transition-colors",
                  index === stepIndex && "bg-primary",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            className="body-small absolute right-0 rounded-md px-2 py-1 text-zinc-600 underline underline-offset-4 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            onClick={closeGuide}
          >
            건너뛰기
          </button>
        </div>

        <div className="mt-5 sm:mt-6">
          <h2 id="booth-map-guide-title" className="heading-small break-keep text-zinc-950">
            {step.title}
          </h2>
          <p id="booth-map-guide-description" className="body-small mt-3 break-keep text-zinc-600">
            {step.description.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>

        {stepIndex === 1 ? (
          <div className="mt-4 grid grid-cols-3 gap-2" aria-label="그리기 도구 안내">
            {DRAW_TOOL_GUIDE_ITEMS.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="body-small-bold flex min-w-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-zinc-950"
              >
                <Icon className="size-5 shrink-0 text-primary" />
                <span className="break-keep">{label}</span>
              </div>
            ))}
          </div>
        ) : null}
        {stepIndex === 3 ? (
          <div className="mt-4" aria-label="선택 기능 안내 예시">
            <div className="grid grid-cols-2 gap-2">
              {[
                { title: "하나 선택", actions: ["수정", "삭제", "대기줄"] },
                {
                  title: "여러 개 선택",
                  actions: ["줄 세우기", "구역에 넣기", "그룹화"],
                },
              ].map(({ title, actions }) => (
                <div key={title} className="rounded-xl border border-zinc-200 bg-zinc-50 p-2.5">
                  <p className="body-small-bold break-keep text-zinc-950">{title}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {actions.map((action) => (
                      <span
                        key={action}
                        className="body-caption rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="body-small mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2.5 text-primary">
              <InfoCircledIcon className="size-4 shrink-0" />
              <span className="break-keep">줄 세우기는 부스 정렬 기능이에요.</span>
            </p>
          </div>
        ) : null}
        <div className="mt-5 pt-2">
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((value) => value - 1)}
            >
              이전
            </Button>
            <Button
              type="button"
              onClick={() =>
                stepIndex === GUIDE_STEPS.length - 1 ? finish() : setStepIndex((value) => value + 1)
              }
            >
              {stepIndex === GUIDE_STEPS.length - 1 ? "완료" : "다음"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
