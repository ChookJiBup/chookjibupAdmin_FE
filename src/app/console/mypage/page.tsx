"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import {
  getAdminProfile,
  logoutAdmin,
  updateAdminProfile as updateAdminProfileApi,
  withdrawAdmin,
} from "@/features/auth/admin/api";
import type { AdminAccountProfile } from "@/features/auth/admin/types";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useAdminAuthStore } from "@/store/adminAuthStore";

type ConfirmKind = "logout" | "withdraw" | null;

export default function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const admin = useAdminAuthStore((state) => state.session?.admin);
  const clearSession = useAdminAuthStore((state) => state.clearSession);
  const updateAdminProfile = useAdminAuthStore((state) => state.updateAdminProfile);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [name, setName] = useState(admin?.name ?? "");
  const [department, setDepartment] = useState(admin?.department ?? "");
  const [rank, setRank] = useState(admin?.rank ?? "");

  const profileQuery = useQuery({
    queryKey: ["admin-profile"],
    queryFn: getAdminProfile,
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawAdmin,
    onSuccess: () => {
      clearSession();
      router.replace("/login");
    },
  });

  const profileUpdateMutation = useMutation({
    mutationFn: updateAdminProfileApi,
    onSuccess: (_, nextProfile) => {
      updateAdminProfile(nextProfile);
      queryClient.setQueryData<AdminAccountProfile>(["admin-profile"], (current) =>
        current ? { ...current, ...nextProfile } : current,
      );
      toast.success("프로필이 수정되었습니다.");
    },
  });

  const profile = profileQuery.data;

  async function handleLogout() {
    try {
      await logoutAdmin();
    } finally {
      clearSession();
      window.localStorage.removeItem("chookjibup-admin-auth");
      router.replace("/login");
    }
  }

  function handleProfileUpdate() {
    const nextProfile = { name: name.trim(), department: department.trim(), rank: rank.trim() };
    profileUpdateMutation.mutate(nextProfile);
  }

  if (!admin) return null;

  return (
    <div className="col-span-2 flex flex-col gap-6 pb-[72px]">
      <FormSection label="프로필 설정">
        <Input label="이메일" disabled value={profile?.email ?? admin.email} />
        <Input label="이름" value={name} onChange={(event) => setName(event.target.value)} />
        <div className="flex gap-3">
          <Input
            label="부서"
            wrapperClassName="flex-1"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          />
          <Input
            label="직급"
            wrapperClassName="flex-1"
            value={rank}
            onChange={(event) => setRank(event.target.value)}
          />
        </div>
        {profileQuery.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(profileQuery.error)}</p>
        ) : null}
        {profileUpdateMutation.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(profileUpdateMutation.error)}</p>
        ) : null}
      </FormSection>

      <FormSection label="보안설정">
        <div className="flex items-center justify-between">
          <p className="body-regular text-zinc-950">비밀번호 변경</p>
          <Button variant="outline" onClick={() => router.push("/reset-password")}>
            비밀번호 재설정
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="body-regular text-zinc-950">로그아웃</p>
          <Button variant="outline" onClick={() => setConfirmKind("logout")}>
            로그아웃
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="body-regular text-zinc-950">계정 삭제</p>
          <Button variant="destructive" onClick={() => setConfirmKind("withdraw")}>
            탈퇴하기
          </Button>
        </div>

        {withdrawMutation.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(withdrawMutation.error)}</p>
        ) : null}
      </FormSection>

      <div className="fixed inset-x-0 bottom-0 z-20 flex h-[72px] items-center justify-end border-t border-zinc-200 bg-white px-10">
        <Button
          disabled={
            !name.trim() || !department.trim() || !rank.trim() || profileUpdateMutation.isPending
          }
          onClick={handleProfileUpdate}
        >
          수정하기
        </Button>
      </div>

      <ConfirmDialog
        open={confirmKind === "logout"}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        title="로그아웃 하시겠습니까?"
        description="모든 기기에서 로그아웃됩니다."
        confirmLabel="로그아웃"
        confirmVariant="primary"
        onConfirm={handleLogout}
      />

      <ConfirmDialog
        open={confirmKind === "withdraw"}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        title="탈퇴하시겠습니까?"
        description="계정 삭제는 영구적입니다. 계정이나 데이터를 복구할 수 없습니다."
        confirmLabel="탈퇴하기"
        confirmVariant="destructive"
        confirmPending={withdrawMutation.isPending}
        onConfirm={() => withdrawMutation.mutate()}
      />
    </div>
  );
}
