"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CheckCircledIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
  CrossCircledIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";

// 이 프로젝트는 라이트 모드 전용이라 next-themes 없이 theme="light"로 고정한다.
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      closeButton
      icons={{
        success: <CheckCircledIcon className="size-4" />,
        info: <InfoCircledIcon className="size-4" />,
        warning: <ExclamationTriangleIcon className="size-4 text-point-600" />,
        error: <CrossCircledIcon className="size-4" />,
        loading: <UpdateIcon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "rounded-lg! border! border-zinc-200! bg-white! shadow-md! body-small! text-zinc-950!",
          title: "body-small-bold! text-zinc-950!",
          description: "body-caption! text-zinc-500!",
          closeButton: "border-zinc-200! bg-white! text-zinc-500!",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
