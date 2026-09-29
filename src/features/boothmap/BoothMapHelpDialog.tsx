"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ClockIcon,
  CornersIcon,
  Cross2Icon,
  DimensionsIcon,
  GroupIcon,
  QuestionMarkCircledIcon,
  RadiobuttonIcon,
  RulerHorizontalIcon,
} from "@radix-ui/react-icons";
import { IconButton } from "@/components/ui/IconButton";
import { DIALOG_OVERLAY_CLASSES } from "@/components/ui/dialogOverlay";

interface HelpItem {
  icon?: ReactNode;
  name: string;
  description: string;
}

/*
  도구 설명은 툴바 버튼의 title과 같은 내용이다. title은 마우스를 얹고 기다려야 뜨고
  터치 기기에서는 아예 보이지 않아, 처음 여는 사람이 아이콘만 보고는 무엇을 하는
  버튼인지 알 수 없었다. 같은 설명을 한자리에 모아 눌러서 읽게 한다.
*/
const DRAW_TOOLS: HelpItem[] = [
  {
    icon: <GroupIcon />,
    name: "범위 선택",
    description: "지도를 끌어 안에 든 것을 한 번에 고릅니다.",
  },
  {
    icon: <RadiobuttonIcon />,
    name: "핀 추가",
    description: "시설·부스·입구·출구·화장실을 찍습니다.",
  },
  { icon: <DimensionsIcon />, name: "폴리곤 추가", description: "구역·주차장처럼 면을 그립니다." },
  { icon: <RulerHorizontalIcon />, name: "라인 추가", description: "통로를 선으로 그립니다." },
  {
    icon: <CornersIcon />,
    name: "부지 경계",
    description: "축제장 테두리입니다. 있어야 AI가 줄을 추천합니다.",
  },
  {
    icon: <ClockIcon />,
    name: "대기줄",
    description: "방문객이 선 줄을 기록합니다. 부스를 먼저 고르세요.",
  },
];

const TOP_BUTTONS: HelpItem[] = [
  { name: "AI 분석", description: "배치도 이미지를 올리면 부스 자리를 자동으로 찍습니다." },
  { name: "팜플렛", description: "팜플렛 이미지를 지도에 깔고 따라 그립니다." },
  { name: "저장", description: "고친 내용을 저장합니다. 바뀐 것이 없으면 꺼져 있습니다." },
  { name: "공개하기", description: "방문객 앱 부스지도에 보여 줍니다. 다시 눌러 내립니다." },
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
            {/* 480px 안에서 이름과 설명을 한 줄에 놓으면 설명이 두세 글자씩 끊긴다. */}
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

/** 부스 편집 화면의 버튼이 각각 무엇을 하는지 모아 보여 주는 도움말. */
export function BoothMapHelpDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <IconButton
          icon={<QuestionMarkCircledIcon />}
          size="lg"
          iconClassName="size-5 [&_svg]:size-5"
          aria-label="도움말"
          className="text-zinc-950"
        />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={DIALOG_OVERLAY_CLASSES} />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] flex max-h-[calc(100dvh-40px)] w-[480px] max-w-[calc(100vw-40px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-2xl bg-white p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="heading-small text-zinc-950">부스 편집 도움말</Dialog.Title>
              <Dialog.Description className="body-small mt-2 text-zinc-500">
                버튼이 각각 무엇을 하는지 모았습니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="닫기" className="shrink-0 text-zinc-950">
                <Cross2Icon className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* 이름이 닮아 가장 많이 헷갈리는 둘을 맨 위에서 갈라 준다. */}
          <p className="body-small mt-6 rounded-lg bg-zinc-100 px-4 py-3 text-zinc-950">
            <span className="body-small-bold">줄 세우기</span>는 부스를 나란히 정렬하는 것이고,
            방문객이 서는 줄은 <span className="body-small-bold">대기줄</span>입니다.
          </p>

          <HelpSection title="그리는 도구 (오른쪽 아래)" items={DRAW_TOOLS} />
          <HelpSection title="위쪽 버튼" items={TOP_BUTTONS} />
          <HelpSection title="부스를 여러 개 고르면" items={SELECTION_ACTIONS} />
          <HelpSection title="부스를 하나 고르면" items={BOOTH_QUEUE_ACTIONS} />

          <p className="body-caption mt-6 text-zinc-500">
            폴리곤·라인·경계를 그릴 때는 아래 안내 바에서 한 점씩 되돌리거나 그만둘 수 있습니다.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
