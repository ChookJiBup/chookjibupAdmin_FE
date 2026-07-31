"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bottombar } from "@/components/ui/Bottombar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { withdrawAdmin } from "@/features/auth/admin/api";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useAdminAuthStore } from "@/store/adminAuthStore";

// 부서/직급을 저장하는 백엔드 필드가 없어, 이 브라우저의 localStorage에만 기억한다.
// 이름 수정도 서버 API가 없어 adminAuthStore(zustand persist)의 세션에만 반영된다.
function profileExtraStorageKey(adminId: string) {
  return `chookjibup-admin-profile-extra-${adminId}`;
}

interface ProfileExtra {
  department: string;
  position: string;
}

function loadProfileExtra(adminId: string): ProfileExtra {
  if (typeof window === "undefined") return { department: "", position: "" };
  const saved = window.localStorage.getItem(profileExtraStorageKey(adminId));
  return saved ? (JSON.parse(saved) as ProfileExtra) : { department: "", position: "" };
}

type ConfirmKind = "logout" | "withdraw" | "save" | null;

export default function MyPage() {
  const router = useRouter();
  const admin = useAdminAuthStore((state) => state.session?.admin);
  const clearSession = useAdminAuthStore((state) => state.clearSession);
  const updateAdminProfile = useAdminAuthStore((state) => state.updateAdminProfile);

  // AdminAuthGuard가 hydrate + 세션 확인 전에는 children을 렌더링하지 않으므로,
  // 이 컴포넌트가 처음 그려지는 시점엔 admin이 이미 준비돼 있다.
  const [name, setName] = useState(() => admin?.name ?? "");
  const [department, setDepartment] = useState(
    () => (admin ? loadProfileExtra(admin.adminId) : { department: "", position: "" }).department,
  );
  const [position, setPosition] = useState(
    () => (admin ? loadProfileExtra(admin.adminId) : { department: "", position: "" }).position,
  );
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);

  const withdrawMutation = useMutation({
    mutationFn: withdrawAdmin,
    onSuccess: () => {
      clearSession();
      router.replace("/login");
    },
  });

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  function handleSaveProfile() {
    if (!admin) return;
    updateAdminProfile({ name });
    window.localStorage.setItem(
      profileExtraStorageKey(admin.adminId),
      JSON.stringify({ department, position }),
    );
    setConfirmKind(null);
  }

  if (!admin) return null;

  return (
    <div className="flex max-w-[790px] flex-col gap-6 pb-[72px]">
      <FormSection label="프로필 설정">
        <Input label="이메일" disabled value={admin.email} />
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
            value={position}
            onChange={(event) => setPosition(event.target.value)}
          />
        </div>
      </FormSection>

      <FormSection label="보안설정">
        <div className="flex items-center justify-between">
          <p className="body-regular text-zinc-950">비밀번호 변경</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/forgot-password")}>
            비밀번호 재설정
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
      </FormSection>

      <Bottombar submitLabel="수정하기" onSubmit={() => setConfirmKind("save")} />

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

      <ConfirmDialog
        open={confirmKind === "save"}
        onOpenChange={(open) => !open && setConfirmKind(null)}
        title="변경사항을 저장하시겠습니까?"
        confirmLabel="수정"
        confirmVariant="primary"
        onConfirm={handleSaveProfile}
      />
    </div>
  );
}
