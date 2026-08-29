"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { StaffBadge } from "@/components/ui/RoleBadge";
import { useStaffAuthStore } from "@/store/staffAuthStore";

/** 스태프 전용 화면 상단바. 로그인한 뒤에만 부스 검색·로그아웃 액션이 보인다. */
export function StaffHeader() {
  const router = useRouter();
  const session = useStaffAuthStore((state) => state.session);
  const clearSession = useStaffAuthStore((state) => state.clearSession);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isLoggedIn = session !== null;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5">
      <Link
        href={isLoggedIn ? "/staff/dashboard" : "/staff/login"}
        className="flex items-center gap-2"
      >
        <span className="flex h-8 w-12 items-center justify-center rounded bg-zinc-200">
          <span className="body-caption text-zinc-500">로고</span>
        </span>
        <StaffBadge />
      </Link>

      {isLoggedIn ? (
        <div className="flex items-center gap-3">
          <IconButton
            variant="ghost"
            aria-label="부스 검색"
            icon={<MagnifyingGlassIcon />}
            iconClassName="size-6 text-zinc-950"
            onClick={() => router.push("/staff/booths")}
          />
          <Button
            variant="outline"
            size="sm"
            className="px-2 py-1"
            onClick={() => setLogoutOpen(true)}
          >
            로그아웃
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="로그아웃하시겠습니까?"
        confirmLabel="로그아웃"
        overlayClassName="top-0"
        className="p-6"
        onConfirm={() => {
          setLogoutOpen(false);
          clearSession();
          router.replace("/staff/login");
        }}
      />
    </header>
  );
}
