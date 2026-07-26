"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getFieldStaff } from "./api";
import type { FieldStaffStatus } from "./types";

const STATUS_LABEL: Record<FieldStaffStatus, string> = {
  ACTIVE: "활성",
  DELETED: "삭제됨",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

export function FieldStaffDetailPanel({
  festivalId,
  staffId,
}: {
  festivalId: string;
  staffId: string;
}) {
  const staffQuery = useQuery({
    queryKey: ["field-staff", festivalId, staffId],
    queryFn: () => getFieldStaff(festivalId, staffId),
  });

  if (staffQuery.isLoading) {
    return <p className="body-regular text-gray-500">불러오는 중...</p>;
  }

  if (staffQuery.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(staffQuery.error)}</p>;
  }

  const staff = staffQuery.data;
  if (!staff) return null;

  return (
    <dl className="flex flex-col gap-2 rounded-lg border px-4 py-3">
      <div className="flex gap-2">
        <dt className="body-small w-24 text-gray-500">이름</dt>
        <dd className="body-regular">{staff.name}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-gray-500">로그인 ID</dt>
        <dd className="body-regular">{staff.loginId}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-gray-500">전화번호</dt>
        <dd className="body-regular">{staff.phoneNumber}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-gray-500">유효 기간</dt>
        <dd className="body-regular">
          {formatDate(staff.validFrom)} ~ {formatDate(staff.validUntil)}
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="body-small w-24 text-gray-500">상태</dt>
        <dd className="body-regular">{STATUS_LABEL[staff.status]}</dd>
      </div>
    </dl>
  );
}
