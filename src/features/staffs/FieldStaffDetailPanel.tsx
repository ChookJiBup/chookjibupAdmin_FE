"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import {
  getFieldStaff,
  reissueFieldStaffPassword,
  updateFieldStaff,
  updateFieldStaffStatus,
} from "./api";
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
  const queryClient = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const staffQuery = useQuery({
    queryKey: ["field-staff", festivalId, staffId],
    queryFn: () => getFieldStaff(festivalId, staffId),
  });
  const staff = staffQuery.data;

  const invalidateStaff = () =>
    queryClient.invalidateQueries({ queryKey: ["field-staff", festivalId] });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!staff) return Promise.resolve();
      return updateFieldStaff(festivalId, staffId, {
        name: name ?? staff.name,
        phoneNumber: phoneNumber ?? staff.phoneNumber,
      });
    },
    onSuccess: () => {
      setName(null);
      setPhoneNumber(null);
      invalidateStaff();
    },
  });
  const statusMutation = useMutation({
    mutationFn: (active: boolean) => updateFieldStaffStatus(festivalId, staffId, active),
    onSuccess: invalidateStaff,
  });
  const passwordMutation = useMutation({
    mutationFn: () => reissueFieldStaffPassword(festivalId, staffId),
    onSuccess: (result) => setTemporaryPassword(result.temporaryPassword),
  });

  if (staffQuery.isLoading) {
    return <p className="body-regular text-zinc-500">불러오는 중...</p>;
  }

  if (staffQuery.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(staffQuery.error)}</p>;
  }

  if (!staff) return null;

  return (
    <div className="flex flex-col gap-4 rounded-lg border px-4 py-3">
      <dl className="flex flex-col gap-2">
        <div className="flex gap-2">
          <dt className="body-small w-24 text-zinc-500">이름</dt>
          <dd className="body-regular">{staff.name}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="body-small w-24 text-zinc-500">로그인 ID</dt>
          <dd className="body-regular">{staff.loginId}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="body-small w-24 text-zinc-500">전화번호</dt>
          <dd className="body-regular">{staff.phoneNumber}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="body-small w-24 text-zinc-500">유효 기간</dt>
          <dd className="body-regular">
            {formatDate(staff.validFrom)} ~ {formatDate(staff.validUntil)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="body-small w-24 text-zinc-500">상태</dt>
          <dd className="body-regular">{STATUS_LABEL[staff.status]}</dd>
        </div>
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="이름"
          value={name ?? staff.name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="전화번호"
          value={phoneNumber ?? staff.phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
          정보 저장
        </Button>
        <Button
          variant="outline"
          disabled={statusMutation.isPending}
          onClick={() => statusMutation.mutate(staff.status !== "ACTIVE")}
        >
          {staff.status === "ACTIVE" ? "비활성화" : "활성화"}
        </Button>
        <Button
          variant="outline"
          disabled={passwordMutation.isPending}
          onClick={() => passwordMutation.mutate()}
        >
          임시 비밀번호 재발급
        </Button>
      </div>
      {temporaryPassword ? (
        <p className="body-small rounded-md bg-zinc-50 p-3">
          새 임시 비밀번호: <span className="font-mono">{temporaryPassword}</span>
        </p>
      ) : null}
      {updateMutation.isError || statusMutation.isError || passwordMutation.isError ? (
        <p className="body-small text-error">
          {getApiErrorMessage(
            updateMutation.error ?? statusMutation.error ?? passwordMutation.error,
          )}
        </p>
      ) : null}
    </div>
  );
}
