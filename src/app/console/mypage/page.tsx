"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import {
  getAdminProfile,
  requestAuthenticatedPasswordReset,
  withdrawAdmin,
} from "@/features/auth/admin/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useAdminAuthStore } from "@/store/adminAuthStore";

type ConfirmKind = "logout" | "withdraw" | null;

export default function MyPage() {
  const router = useRouter();
  const admin = useAdminAuthStore((state) => state.session?.admin);
  const clearSession = useAdminAuthStore((state) => state.clearSession);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

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

  const passwordResetMutation = useMutation({
    mutationFn: requestAuthenticatedPasswordReset,
    onSuccess: () => toast.success("비밀번호 변경 링크를 이메일로 전송했습니다."),
  });

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!admin) return null;
  const profile = profileQuery.data;

  return (
    <div className="col-span-2 flex flex-col gap-6 pb-[72px]">
      <FormSection label="프로필 설정">
        <Input label="이메일" disabled value={profile?.email ?? admin.email} />
        <Input label="이름" disabled value={profile?.name ?? admin.name} />
        <Input label="소속 기관" disabled value={profile?.organization ?? admin.organization} />
        <div className="flex gap-3">
          <Input
            label="부서"
            wrapperClassName="flex-1"
            disabled
            value={profile?.department ?? ""}
          />
          <Input label="직급" wrapperClassName="flex-1" disabled value={profile?.rank ?? ""} />
        </div>
        {profileQuery.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(profileQuery.error)}</p>
        ) : null}
      </FormSection>

      <FormSection label="보안설정">
        <div className="flex items-center justify-between">
          <p className="body-regular text-zinc-950">비밀번호 변경</p>
          <Button
            variant="outline"
            size="sm"
            disabled={passwordResetMutation.isPending}
            onClick={() => passwordResetMutation.mutate()}
          >
            변경 링크 받기
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="body-regular text-zinc-950">로그아웃</p>
          <Button variant="outline" size="sm" onClick={() => setConfirmKind("logout")}>
            로그아웃
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="body-regular text-zinc-950">계정 삭제</p>
          <Button variant="destructive" size="sm" onClick={() => setConfirmKind("withdraw")}>
            탈퇴하기
          </Button>
        </div>

        {withdrawMutation.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(withdrawMutation.error)}</p>
        ) : null}
        {passwordResetMutation.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(passwordResetMutation.error)}</p>
        ) : null}
      </FormSection>

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
