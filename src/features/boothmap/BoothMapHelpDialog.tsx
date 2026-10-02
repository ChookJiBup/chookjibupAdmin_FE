"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArchiveIcon,
  CornersIcon,
  Cross2Icon,
  DownloadIcon,
  EyeOpenIcon,
  GroupIcon,
  HamburgerMenuIcon,
  InfoCircledIcon,
  MagicWandIcon,
  PersonIcon,
  RadiobuttonIcon,
  Share2Icon,
} from "@radix-ui/react-icons";
import { DIALOG_OVERLAY_CLASSES } from "@/components/ui/dialogOverlay";

export interface HelpItem {
  icon?: ReactNode;
  name: string;
  description: string;
  note?: string;
}

export interface HelpCardProps {
  step: string;
  title: string;
  location: string;
  items: HelpItem[];
  warning?: string;
}

const HELP_CARDS: HelpCardProps[] = [
  {
    step: "01",
    title: "지도 만들기",
    location: "오른쪽 아래 도구",
    items: [
      {
        icon: <CornersIcon />,
        name: "부지 경계",
        description: "축제 구역의 테두리를 먼저 그려요.",
      },
      {
        icon: <RadiobuttonIcon />,
        name: "핀 추가",
        description: "부스·시설·입구·출구·화장실 위치를 찍어요.",
      },
      {
        icon: <GroupIcon />,
        name: "범위 선택",
        description: "지도를 드래그해 여러 부스를 한 번에 선택해요.",
      },
    ],
  },
  {
    step: "02",
    title: "여러 부스 정리하기",
    location: "부스 2개 이상 선택",
    items: [
      {
        icon: <GroupIcon />,
        name: "그룹화",
        description: "선택한 부스를 묶어 새 구역을 만들어요.",
      },
      {
        icon: <DownloadIcon />,
        name: "구역에 넣기",
        description: "선택한 부스를 기존 구역에 넣어요.",
      },
      {
        icon: <HamburgerMenuIcon />,
        name: "줄 세우기",
        description: "두 끝점 사이에 부스를 일렬로 배치해요.",
      },
    ],
  },
  {
    step: "03",
    title: "대기줄 설정하기",
    location: "부스 1개 선택",
    items: [
      {
        icon: <Share2Icon />,
        name: "사전 줄",
        description: "대기줄이 생길 경로를 미리 그려요.",
        note: "AI로 경로를 추천받을 수 있어요.",
      },
      {
        icon: <PersonIcon />,
        name: "현재 줄",
        description: "지금 대기줄의 끝 위치를 기록해요.",
      },
    ],
    warning: "사전 줄을 설정한 뒤 사용할 수 있어요.",
  },
  {
    step: "04",
    title: "저장하고 공개하기",
    location: "화면 위쪽 버튼",
    items: [
      {
        icon: <MagicWandIcon />,
        name: "AI 분석",
        description: "팜플렛을 올리면 부스 위치를 자동으로 표시해요.",
      },
      {
        icon: <ArchiveIcon />,
        name: "저장",
        description: "변경한 내용을 저장해요.",
        note: "변경 사항이 없을 때만 버튼이 꺼져요.",
      },
      {
        icon: <EyeOpenIcon />,
        name: "공개 / 비공개",
        description: "방문객 앱에 부스 지도를 보여줄지 정해요.",
      },
    ],
  },
];

function HelpCard({ step, title, location, items, warning }: HelpCardProps) {
  return (
    <section className="flex flex-col rounded-lg border border-zinc-200 p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] leading-none font-semibold text-primary">
          {step}
        </span>
        <h3 className="body-small-bold min-w-0 truncate text-left text-zinc-950">{title}</h3>
        <span className="flex shrink-0 items-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] leading-4 text-zinc-500">
          {location}
        </span>
      </div>
      <div className="mt-3">
        {items.map((item, index) => (
          <div
            key={item.name}
            className={`relative flex items-stretch gap-2 py-2 first:pt-0 last:pb-0 ${
              item.icon ? "" : "pl-10"
            } ${index < items.length - 1 ? "after:absolute after:right-2 after:bottom-0 after:left-0 after:border-b after:border-zinc-200" : ""}`}
          >
            {item.icon ? (
              <span className="flex size-8 shrink-0 items-center justify-center text-zinc-950 [&_svg]:size-4.5">
                {item.icon}
              </span>
            ) : null}
            <div className="mr-2 min-w-0 flex-1">
              <p className="body-small-bold text-zinc-950">{item.name}</p>
              <p className="body-caption mt-0.5 text-zinc-500">{item.description}</p>
              {item.note ? <p className="body-caption mt-0.5 text-primary">{item.note}</p> : null}
            </div>
          </div>
        ))}
      </div>
      {warning ? (
        <div className="mt-2 pl-10">
          <p className="body-caption inline-flex items-center gap-1.5 rounded-md bg-secondary-300/20 px-2 py-1 text-secondary-600">
            <InfoCircledIcon className="size-3.5 shrink-0" />
            {warning}
          </p>
        </div>
      ) : null}
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
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[1001] flex max-h-[74dvh] w-[720px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 shadow-xl">
          <header className="relative shrink-0 text-center">
            <Dialog.Title className="heading-regular text-zinc-950">
              부스 지도 사용 가이드
            </Dialog.Title>
            <Dialog.Description className="body-small mt-1 text-zinc-500">
              경계를 먼저 설정하고, 부스를 배치한 뒤 저장하세요.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                className="absolute top-0 right-0 text-zinc-950"
              >
                <Cross2Icon className="size-5" />
              </button>
            </Dialog.Close>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
            {HELP_CARDS.map((card) => (
              <HelpCard key={card.step} {...card} />
            ))}
          </div>
          <footer className="-mt-2 flex shrink-0 items-center justify-center gap-1.5">
            <InfoCircledIcon className="size-3.5 shrink-0 text-zinc-500" />
            <p className="body-caption text-zinc-500">
              경계의 점을 끌어 수정하고, 하단의 취소·경계 완료 버튼으로 마무리해요.
            </p>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
