"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminLogoutButton } from "@/components/auth/AdminLogoutButton";
import { withdrawAdmin } from "@/features/auth/admin/api";
import type { AdminRole } from "@/features/auth/admin/types";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useAdminAuthStore } from "@/store/adminAuthStore";

const ROLE_LABEL: Record<AdminRole, string> = {
  FESTIVAL_OWNER: "총괄관리자",
  SUB_ADMIN: "운영자",
};

export default function MyPage() {
  const router = useRouter();
  const admin = useAdminAuthStore((state) => state.session?.admin);
  const clearSession = useAdminAuthStore((state) => state.clearSession);
  const [withdrawArmed, setWithdrawArmed] = useState(false);

  const withdrawMutation = useMutation({
    mutationFn: withdrawAdmin,
    onSuccess: () => {
      clearSession();
      router.replace("/login");
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="heading-small">마이페이지 (관리자)</h1>
          <p className="body-small text-zinc-500">회원 정보 조회/수정, 회원 탈퇴</p>
        </div>
        <AdminLogoutButton />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="body-regular-bold">회원 정보</h2>
        {admin && (
          <dl className="flex flex-col gap-1">
            <div className="flex gap-2">
              <dt className="body-small w-20 text-zinc-500">이메일</dt>
              <dd className="body-regular">{admin.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="body-small w-20 text-zinc-500">이름</dt>
              <dd className="body-regular">{admin.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="body-small w-20 text-zinc-500">소속</dt>
              <dd className="body-regular">{admin.organization}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="body-small w-20 text-zinc-500">역할</dt>
              <dd className="body-regular">
                {admin.role ? ROLE_LABEL[admin.role] : "연결된 축제 없음"}
              </dd>
            </div>
          </dl>
        )}
        <p className="body-small text-zinc-400">
          이메일/조직/비밀번호 변경은 아직 백엔드 API가 준비되지 않아 제공되지 않습니다.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="body-regular-bold text-error">회원 탈퇴</h2>
        <p className="body-small text-zinc-500">
          탈퇴하면 계정이 비활성화되어 더 이상 로그인할 수 없습니다. 총괄관리자로 연결된 축제가
          있으면 탈퇴가 제한될 수 있습니다.
        </p>

        {withdrawMutation.isError && (
          <p className="body-small text-error">{getApiErrorMessage(withdrawMutation.error)}</p>
        )}

        {!withdrawArmed ? (
          <button
            type="button"
            onClick={() => setWithdrawArmed(true)}
            className="body-regular w-fit rounded-lg border border-error px-4 py-2 text-error"
          >
            회원 탈퇴
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
              className="body-regular-bold rounded-lg border border-error bg-error px-4 py-2 text-white disabled:opacity-50"
            >
              {withdrawMutation.isPending ? "처리 중..." : "정말 탈퇴합니다"}
            </button>
            <button
              type="button"
              onClick={() => setWithdrawArmed(false)}
              className="body-regular rounded-lg border px-4 py-2"
            >
              취소
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
