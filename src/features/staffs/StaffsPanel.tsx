"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { createFieldStaff, deleteFieldStaff, getFieldStaffList } from "./api";
import type { CreateFieldStaffResult, FieldStaffStatus } from "./types";

const STATUS_LABEL: Record<FieldStaffStatus, string> = {
  ACTIVE: "활성",
  DELETED: "삭제됨",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR");
}

function DeleteButton({ festivalId, staffId }: { festivalId: string; staffId: string }) {
  const [armed, setArmed] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteFieldStaff(festivalId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-staff", festivalId] });
    },
  });

  if (deleteMutation.isError) {
    return <p className="body-small text-error">{getApiErrorMessage(deleteMutation.error)}</p>;
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="body-small rounded-lg border px-3 py-1.5"
      >
        삭제
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        className="body-small rounded-lg border border-error px-3 py-1.5 text-error disabled:opacity-50"
      >
        {deleteMutation.isPending ? "삭제 중..." : "정말 삭제"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="body-small rounded-lg border px-3 py-1.5"
      >
        취소
      </button>
    </div>
  );
}

export function StaffsPanel({ festivalId }: { festivalId: string }) {
  const queryClient = useQueryClient();
  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [created, setCreated] = useState<CreateFieldStaffResult | null>(null);

  const staffListQuery = useQuery({
    queryKey: ["field-staff", festivalId],
    queryFn: () => getFieldStaffList(festivalId),
  });

  const createMutation = useMutation({
    mutationFn: () => createFieldStaff(festivalId, { loginId, name, phoneNumber }),
    onSuccess: (result) => {
      setCreated(result);
      setLoginId("");
      setName("");
      setPhoneNumber("");
      queryClient.invalidateQueries({ queryKey: ["field-staff", festivalId] });
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="body-regular-bold">현장 스태프 목록</h2>

        {staffListQuery.isLoading && <p className="body-regular text-gray-500">불러오는 중...</p>}

        {staffListQuery.isError && (
          <p className="body-small text-error">{getApiErrorMessage(staffListQuery.error)}</p>
        )}

        {staffListQuery.data && staffListQuery.data.length === 0 && (
          <p className="body-regular text-gray-500">등록된 스태프가 없습니다.</p>
        )}

        {staffListQuery.data && staffListQuery.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {staffListQuery.data.map((staff) => (
              <li
                key={staff.staffId}
                className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="body-regular-bold">
                    {staff.name} <span className="body-small text-gray-500">({staff.loginId})</span>
                  </p>
                  <p className="body-small text-gray-500">
                    {staff.phoneNumber} · {formatDate(staff.validFrom)} ~{" "}
                    {formatDate(staff.validUntil)} · {STATUS_LABEL[staff.status]}
                  </p>
                </div>
                <DeleteButton festivalId={festivalId} staffId={staff.staffId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="body-regular-bold">스태프 계정 생성</h2>

        {created && (
          <div className="flex flex-col gap-1 rounded-lg border border-error px-4 py-3">
            <p className="body-regular-bold">
              {created.name} ({created.loginId}) 계정이 생성되었습니다.
            </p>
            <p className="body-regular">
              임시 비밀번호: <span className="font-mono">{created.temporaryPassword}</span>
            </p>
            <p className="body-small text-gray-500">
              임시 비밀번호는 지금만 확인할 수 있습니다. 스태프에게 바로 전달해주세요.
            </p>
          </div>
        )}

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setCreated(null);
            createMutation.mutate();
          }}
        >
          <input
            type="text"
            required
            minLength={4}
            maxLength={30}
            pattern="^[A-Za-z0-9._-]+$"
            title="영문, 숫자, ., _, - 로 4~30자"
            placeholder="로그인 아이디"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />
          <input
            type="text"
            required
            maxLength={100}
            placeholder="이름"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />
          <input
            type="text"
            required
            pattern="^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$"
            title="예: 010-1234-5678"
            placeholder="전화번호 (예: 010-1234-5678)"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className="body-regular rounded-lg border px-3 py-2"
          />

          {createMutation.isError && (
            <p className="body-small text-error">{getApiErrorMessage(createMutation.error)}</p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="body-regular-bold w-fit rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            {createMutation.isPending ? "생성 중..." : "생성"}
          </button>
        </form>
      </section>
    </div>
  );
}
