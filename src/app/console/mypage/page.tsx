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
  requestAuthenticatedPasswordReset,
  updateAdminProfile as updateAdminProfileApi,
  verifyAdminPassword,
  withdrawAdmin,
} from "@/features/auth/admin/api";
import { PasswordConfirmDialog } from "@/features/auth/admin/PasswordConfirmDialog";
import type { AdminAccountProfile } from "@/features/auth/admin/types";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useAdminAuthStore } from "@/store/adminAuthStore";

type ConfirmKind = "logout" | "withdraw" | null;

export default function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const admin = useAdminAuthStore((state) => state.session?.admin);
  const clearSession = useAdminAuthStore((state) => state.clearSession);
  const setSession = useAdminAuthStore((state) => state.setSession);
  const updateAdminProfile = useAdminAuthStore((state) => state.updateAdminProfile);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [organization, setOrganization] = useState("");
  const [rank, setRank] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["admin-profile"],
    queryFn: getAdminProfile,
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawAdmin,
    onSuccess: async () => {
      try {
        await logoutAdmin();
      } finally {
        clearSession();
        router.replace("/login");
      }
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: requestAuthenticatedPasswordReset,
    onSuccess: () => {
      toast.success("입력한 이메일로 재설정 링크를 보냈습니다.");
    },
  });

  const profileUpdateMutation = useMutation({
    mutationFn: updateAdminProfileApi,
    onSuccess: (_, nextProfile) => {
      updateAdminProfile({
        name: nextProfile.name,
        organization: nextProfile.organization,
        rank: nextProfile.rank,
      });
      queryClient.setQueryData<AdminAccountProfile>(["admin-profile"], (current) =>
        current
          ? {
              ...current,
              name: nextProfile.name,
              organization: nextProfile.organization,
              rank: nextProfile.rank,
            }
          : current,
      );
      toast.success("프로필이 수정되었습니다.");
      setPasswordConfirmOpen(false);
      setIsEditing(false);
    },
  });

  const passwordConfirmMutation = useMutation({
    mutationFn: (password: string) => verifyAdminPassword({ email: admin?.email ?? "", password }),
    onSuccess: (loginResponse) => {
      setSession(loginResponse.expiresIn, loginResponse.admin);
      const accountKind = profile?.accountKind ?? admin?.accountKind;
      profileUpdateMutation.mutate({
        name: profile?.name ?? admin?.name ?? "",
        organization: organization.trim(),
        rank: accountKind === "CONTRACTOR" ? null : rank.trim(),
      });
    },
  });

  const profile = profileQuery.data;

  async function handleLogout() {
    try {
      await logoutAdmin();
    } finally {
      clearSession();
      router.replace("/login");
    }
  }

  function handleProfileUpdate() {
    passwordConfirmMutation.reset();
    setPasswordConfirmOpen(true);
  }

  function handleEditStart() {
    setOrganization(profile?.organization ?? admin?.organization ?? "");
    setRank(profile?.rank ?? admin?.rank ?? "");
    setIsEditing(true);
  }

  if (!admin) return null;

  if (profileQuery.isLoading) {
    return <p className="body-regular text-zinc-500">불러오는 중...</p>;
  }

  const accountKind = profile?.accountKind ?? admin.accountKind;
  const isContractor = accountKind === "CONTRACTOR";
  const displayedOrganization = isEditing
    ? organization
    : (profile?.organization ?? admin.organization);
  const displayedRank = isEditing ? rank : (profile?.rank ?? admin.rank ?? "");

  return (
    <div className={`col-span-2 flex flex-col gap-6 ${isEditing ? "pb-[72px]" : ""}`}>
      <FormSection label="프로필 설정">
        {!isEditing ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleEditStart}>
              수정하기
            </Button>
          </div>
        ) : null}

        <Input label="이메일" disabled value={profile?.email ?? admin.email} />
        <Input label="이름" disabled value={profile?.name ?? admin.name} />
        <div className="flex gap-3">
          <Input
            label={isContractor ? "업체명" : "과·팀"}
            placeholder={isContractor ? "예: 축제기획(주)" : "예: 토목과"}
            required
            minLength={2}
            maxLength={255}
            disabled={!isEditing}
            wrapperClassName="flex-1"
            value={displayedOrganization}
            onChange={(event) => setOrganization(event.target.value)}
          />
          {!isContractor ? (
            <Input
              label="직급"
              placeholder="예: 과장"
              required
              maxLength={50}
              disabled={!isEditing}
              wrapperClassName="flex-1"
              value={displayedRank}
              onChange={(event) => setRank(event.target.value)}
            />
          ) : null}
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
          <Button
            variant="outline"
            disabled={passwordResetMutation.isPending}
            onClick={() => passwordResetMutation.mutate()}
          >
            비밀번호 재설정
          </Button>
        </div>
        {passwordResetMutation.isError ? (
          <p className="body-small text-error">{getApiErrorMessage(passwordResetMutation.error)}</p>
        ) : null}

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

      {isEditing ? (
        <div className="fixed inset-x-0 bottom-0 z-20 flex h-[72px] items-center justify-end border-t border-zinc-200 bg-white px-10">
          <Button
            disabled={
              !organization.trim() ||
              (!isContractor && !rank.trim()) ||
              profileUpdateMutation.isPending
            }
            onClick={handleProfileUpdate}
          >
            {profileUpdateMutation.isPending ? "수정 중..." : "수정하기"}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmKind === "logout"}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        title="로그아웃 하시겠습니까?"
        description="현재 브라우저에서 로그아웃됩니다."
        confirmLabel="로그아웃"
        confirmVariant="primary"
        onConfirm={handleLogout}
      />

      {passwordConfirmOpen ? (
        <PasswordConfirmDialog
          open
          email={profile?.email ?? admin.email}
          onOpenChange={(open) => {
            setPasswordConfirmOpen(open);
            if (!open) passwordConfirmMutation.reset();
          }}
          pending={passwordConfirmMutation.isPending || profileUpdateMutation.isPending}
          errorMessage={
            passwordConfirmMutation.isError
              ? getApiErrorMessage(passwordConfirmMutation.error)
              : profileUpdateMutation.isError
                ? getApiErrorMessage(profileUpdateMutation.error)
                : undefined
          }
          onConfirm={(password) => passwordConfirmMutation.mutate(password)}
        />
      ) : null}

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
