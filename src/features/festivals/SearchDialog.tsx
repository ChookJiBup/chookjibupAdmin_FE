"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Input } from "@/components/ui/Input";

export interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  helperText: string;
  helperItems?: string[];
  onSubmit: (value: string) => void;
}

/** 축제 검색/주소 찾기처럼 "제목 + 검색창 + 안내문구" 구조를 공유하는 모달. */
export function SearchDialog({
  open,
  onOpenChange,
  title,
  placeholder,
  helperText,
  helperItems,
  onSubmit,
}: SearchDialogProps) {
  const [value, setValue] = useState("");

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setValue("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-dimmed" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8">
          <div className="flex items-center justify-between">
            <Dialog.Title className="heading-small text-zinc-950">{title}</Dialog.Title>
            <Dialog.Close aria-label="닫기" className="text-zinc-950">
              <Cross2Icon className="size-4" />
            </Dialog.Close>
          </div>

          <form
            className="mt-6 flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = value.trim();
              if (!trimmed) return;
              onSubmit(trimmed);
              onOpenChange(false);
              setValue("");
            }}
          >
            <Input
              autoFocus
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-4">
              <p className="body-small-bold text-zinc-950">{helperText}</p>
              {helperItems && helperItems.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {helperItems.map((item) => (
                    <li key={item} className="body-small text-zinc-500">
                      · {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
