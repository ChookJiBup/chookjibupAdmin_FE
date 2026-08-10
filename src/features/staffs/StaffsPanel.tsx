"use client";

import { PersonIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { createFieldStaff, deleteFieldStaff, getFieldStaffList } from "./api";
import type { CreateFieldStaffResult } from "./types";

export function StaffsPanel({ festivalId }: { festivalId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [created, setCreated] = useState<CreateFieldStaffResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 근무부서를 저장하는 백엔드 필드가 없어, 이번 세션에서 직접 생성한 스태프에 한해 화면에서만 기억한다.
  const [departmentByStaffId, setDepartmentByStaffId] = useState<Record<string, string>>({});

  const staffListQuery = useQuery({
    queryKey: ["field-staff", festivalId],
    queryFn: () => getFieldStaffList(festivalId),
  });
  const staffList = staffListQuery.data ?? [];

  // 아이디 발급 API가 없어, 현재 스태프 수를 기반으로 다음 아이디를 미리 보여준다.
  const previewLoginId = `staff${staffList.length + 1}`;

  const createMutation = useMutation({
    mutationFn: () => createFieldStaff(festivalId, { loginId: previewLoginId, name, phoneNumber }),
    onSuccess: (result) => {
      if (department) {
        setDepartmentByStaffId((prev) => ({ ...prev, [result.staffId]: department }));
      }
      setCreated(result);
      setName("");
      setDepartment("");
      setPhoneNumber("");
      queryClient.invalidateQueries({ queryKey: ["field-staff", festivalId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (staffIds: string[]) =>
      Promise.all(staffIds.map((staffId) => deleteFieldStaff(festivalId, staffId))),
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["field-staff", festivalId] });
    },
  });

  const allSelected = staffList.length > 0 && selectedIds.size === staffList.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(staffList.map((staff) => staff.staffId)));
  }

  function toggleOne(staffId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  }

  return (
    <div className="col-span-3 flex flex-col gap-4">
      <div className="grid grid-cols-3 items-start gap-6">
        <div className="col-span-1 flex flex-col gap-4 rounded-lg border border-zinc-300 p-6">
          <p className="body-large-bold text-zinc-950">스태프 추가</p>

          {created ? (
            <div className="flex flex-col gap-1 rounded-lg bg-zinc-50 px-4 py-3">
              <p className="body-small-bold text-zinc-950">
                {created.name}({created.loginId}) 계정이 생성되었습니다.
              </p>
              <p className="body-small text-zinc-950">
                임시 비밀번호: <span className="font-mono">{created.temporaryPassword}</span>
              </p>
              <p className="body-caption text-zinc-500">
                임시 비밀번호는 지금만 확인할 수 있습니다. 스태프에게 바로 전달해주세요.
              </p>
            </div>
          ) : null}

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setCreated(null);
              createMutation.mutate();
            }}
          >
            <Input
              label="이름"
              placeholder="이름"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
            <Input
              label="아이디"
              disabled
              value={previewLoginId}
              helperText="아이디는 자동으로 생성됩니다"
            />
            <Input
              label="비밀번호"
              type="password"
              disabled
              value="0000"
              helperText="기본 비밀번호는 0000입니다"
            />
            <Input
              label="근무부서"
              placeholder="근무부서"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              required
            />
            <Input
              label="전화번호"
              placeholder="전화번호"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
              pattern="^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$"
              title="예: 010-1234-5678"
            />

            {createMutation.isError ? (
              <p className="body-caption text-error">{getApiErrorMessage(createMutation.error)}</p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "추가하는 중..." : "추가하기"}
              </Button>
            </div>
          </form>
        </div>

        <div className="col-span-2 flex flex-col rounded-lg border border-zinc-300">
          <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-4">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={staffList.length === 0}
            />
            <p className="body-regular-bold text-zinc-950">
              전체 <span className="text-primary">{staffList.length}</span>
            </p>
          </div>

          {staffListQuery.isLoading ? (
            <p className="body-regular p-6 text-zinc-500">불러오는 중...</p>
          ) : null}

          {staffListQuery.isError ? (
            <p className="body-small p-6 text-error">{getApiErrorMessage(staffListQuery.error)}</p>
          ) : null}

          {!staffListQuery.isLoading && staffList.length === 0 ? (
            <p className="body-regular p-6 text-zinc-500">등록된 스태프가 없습니다.</p>
          ) : null}

          {staffList.length > 0 ? (
            <div className="flex flex-col divide-y divide-zinc-200">
              {staffList.map((staff) => (
                <label
                  key={staff.staffId}
                  className="flex cursor-pointer items-center gap-3 px-6 py-4"
                >
                  <Checkbox
                    checked={selectedIds.has(staff.staffId)}
                    onCheckedChange={() => toggleOne(staff.staffId)}
                  />
                  <PersonIcon className="size-4 shrink-0 text-zinc-400" />
                  <div className="flex flex-col gap-0.5">
                    <p className="body-regular-bold text-zinc-950">
                      {staff.name}({staff.phoneNumber})
                    </p>
                    <p className="body-caption text-zinc-500">
                      {departmentByStaffId[staff.staffId] ?? "-"} · {staff.loginId}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {selectedIds.size > 0 ? (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
          <p className="body-small text-zinc-950">
            <span className="body-small-bold text-primary">{selectedIds.size}</span>개 선택됨
          </p>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate([...selectedIds])}
          >
            삭제하기
          </Button>
        </div>
      ) : null}
    </div>
  );
}
