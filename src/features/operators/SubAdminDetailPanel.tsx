"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getSubAdmin } from "./api";
import type { AdminStatus } from "./types";

const STATUS_LABEL: Record<AdminStatus, string> = {
  ACTIVE: "활성",
  SUSPENDED: "정지",
  DELETED: "탈퇴",
};

export function SubAdminDetailPanel({
  festivalId,
  adminId,
}: {
  festivalId: string;
  adminId: string;
}) {
  const subAdminQuery = useQuery({
    queryKey: ["sub-admin", festivalId, adminId],
    queryFn: () => getSubAdmin(festivalId, adminId),
  });

  if (subAdminQuery.isLoading) {
    return <p className="body-regular text-zinc-500">불러오는 중...</p>;
  }

  if (subAdminQuery.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(subAdminQuery.error)}</p>;
  }

  const subAdmin = subAdminQuery.data;
  if (!subAdmin) return null;

  return (
    <dl className="flex flex-col gap-2 rounded-lg border px-4 py-3">
      <div className="flex gap-2">
        <dt className="body-small w-24 text-zinc-500">이름</dt>
        <dd className="body-regular">{subAdmin.name}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-zinc-500">이메일</dt>
        <dd className="body-regular">{subAdmin.email}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-zinc-500">과·팀</dt>
        <dd className="body-regular">{subAdmin.organization}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-zinc-500">직급</dt>
        <dd className="body-regular">{subAdmin.rank}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-zinc-500">상태</dt>
        <dd className="body-regular">{STATUS_LABEL[subAdmin.status]}</dd>
      </div>
    </dl>
  );
}
