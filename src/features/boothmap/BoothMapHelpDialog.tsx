"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CornersIcon, Cross2Icon, GroupIcon, RadiobuttonIcon } from "@radix-ui/react-icons";
import { DIALOG_OVERLAY_CLASSES } from "@/components/ui/dialogOverlay";

interface HelpItem {
  icon?: ReactNode;
  name: string;
  description: string;
}

const DRAW_TOOLS: HelpItem[] = [
  {
    icon: <CornersIcon />,
    name: "부지 경계",
    description: "축제장 테두리입니다. 핀과 범위를 사용하기 전에 먼저 설정합니다.",
  },
  {
    icon: <RadiobuttonIcon />,
    name: "핀 추가",
    description: "시설·부스·입구·출구·화장실을 찍습니다.",
  },
  {
    icon: <GroupIcon />,
    name: "범위 선택",
    description: "지도를 끌어 안에 든 것을 한 번에 고릅니다.",
  },
];

const TOP_BUTTONS: HelpItem[] = [
  { name: "AI 분석", description: "팜플렛 이미지를 올리면 부스 자리를 자동으로 찍습니다." },
  { name: "저장", description: "고친 내용을 저장합니다. 바뀐 것이 없으면 꺼져 있습니다." },
  { name: "공개/비공개", description: "방문객 앱 부스지도에 보일지 설정합니다." },
];

const SELECTION_ACTIONS: HelpItem[] = [
  { name: "줄 세우기", description: "고른 부스를 양 끝 사이에 일직선으로 놓습니다." },
  { name: "구역에 넣기", description: "고른 부스를 이미 있는 구역에 넣습니다." },
  { name: "그룹화", description: "고른 부스로 새 구역을 만듭니다." },
];

const BOOTH_QUEUE_ACTIONS: HelpItem[] = [
  { name: "사전 줄", description: "줄이 설 경로를 미리 그립니다. AI에게 추천받을 수 있습니다." },
  {
    name: "현재 줄",
    description: "지금 줄이 어디까지 찼는지 기록합니다. 사전 줄을 정해야 열립니다.",
  },
];

function HelpSection({ title, items }: { title: string; items: HelpItem[] }) {
  return (
    <section className="mt-6">
      <h3 className="body-small-bold text-zinc-950">{title}</h3>
      <dl className="mt-2 flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.name} className="flex items-start gap-3">
            {item.icon ? (
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-zinc-950 [&_svg]:size-4">
                {item.icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <dt className="body-small-bold text-zinc-950">{item.name}</dt>
              <dd className="body-small text-zinc-500">{item.description}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function BoothMapHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY_CLASSES} />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] flex max-h-[70dvh] w-[480px] max-w-[calc(100vw-40px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-white p-6 sm:p-8">
          <div className="relative text-center">
            <div className="px-8">
              <Dialog.Title className="heading-small text-zinc-950">부스 편집 도움말</Dialog.Title>
              <Dialog.Description className="body-small mt-2 text-zinc-500">
                버튼이 각각 무엇을 하는지 모았습니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                className="absolute top-0 right-0 text-zinc-950"
              >
                <Cross2Icon className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <HelpSection title="그리는 도구 (오른쪽 아래)" items={DRAW_TOOLS} />
          <HelpSection title="위쪽 버튼" items={TOP_BUTTONS} />
          <HelpSection title="부스를 여러 개 고르면" items={SELECTION_ACTIONS} />
          <HelpSection title="부스를 하나 고르면" items={BOOTH_QUEUE_ACTIONS} />
          <p className="body-caption mt-6 text-zinc-500">
            부지 경계를 그릴 때는 아래 안내 바에서 완료하거나 취소할 수 있습니다.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
