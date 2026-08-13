"use client";

import { MagnifyingGlassIcon, PersonIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { assignSubAdmin, deleteSubAdmins, getSubAdmins, searchSubAdminCandidates } from "./api";

export function OperatorsPanel({ festivalId }: { festivalId: string }) {
  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const subAdminsQuery = useQuery({
    queryKey: ["sub-admins", festivalId],
    queryFn: () => getSubAdmins(festivalId),
  });

  const candidatesQuery = useQuery({
    queryKey: ["sub-admin-candidates", festivalId, searchKeyword],
    queryFn: () => searchSubAdminCandidates(festivalId, searchKeyword ?? ""),
    enabled: searchKeyword !== null && searchKeyword.length > 0,
  });

  const operators = subAdminsQuery.data ?? [];
  const addedIds = new Set(operators.map((operator) => operator.adminId));
  const candidates = (candidatesQuery.data ?? []).filter(
    (candidate) => !addedIds.has(candidate.adminId),
  );

  const allSelected = operators.length > 0 && selectedIds.size === operators.length;

  function toggleAll() {
    setSelectedIds(
      allSelected ? new Set() : new Set(operators.map((operator) => operator.adminId)),
    );
  }

  function toggleOne(adminId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(adminId)) {
        next.delete(adminId);
      } else {
        next.add(adminId);
      }
      return next;
    });
  }

  const assignMutation = useMutation({
    mutationFn: (adminId: string) => assignSubAdmin(festivalId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-admins", festivalId] });
      queryClient.invalidateQueries({ queryKey: ["sub-admin-candidates", festivalId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (adminIds: string[]) => deleteSubAdmins(festivalId, adminIds),
    onSuccess: () => {
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["sub-admins", festivalId] });
    },
  });

  return (
    <div className="col-span-3 flex flex-col gap-4">
      <div className="grid grid-cols-3 items-start gap-6">
        <div className="col-span-1 flex flex-col gap-4 rounded-lg border border-zinc-300 bg-white p-6">
          <p className="body-large-bold text-zinc-950">운영자 추가</p>

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchKeyword(keywordInput.trim());
            }}
          >
            <Input
              wrapperClassName="flex-1"
              placeholder="이름 또는 이메일을 입력해 주세요"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
            />
            <Button type="submit" icon={<MagnifyingGlassIcon />}>
              검색
            </Button>
          </form>

          {candidatesQuery.isLoading ? (
            <p className="body-small text-zinc-500">검색 중...</p>
          ) : null}

          {candidatesQuery.isError ? (
            <p className="body-small text-error">{getApiErrorMessage(candidatesQuery.error)}</p>
          ) : null}

          {searchKeyword === null ? (
            <div className="rounded-lg bg-zinc-50 px-4 py-3">
              <p className="body-small text-zinc-500">
                이름이나 이메일로 검색해 운영자를 추가할 수 있어요.
              </p>
            </div>
          ) : null}

          {searchKeyword !== null && !candidatesQuery.isLoading && candidates.length === 0 ? (
            <p className="body-small text-zinc-500">검색 결과가 없습니다.</p>
          ) : null}

          {candidates.length > 0 ? (
            <ul className="flex flex-col divide-y divide-zinc-200">
              {candidates.map((candidate) => (
                <li
                  key={candidate.adminId}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className="body-small-bold text-zinc-950">{candidate.name}</p>
                    <p className="body-caption text-zinc-500">
                      {candidate.email}
                      {candidate.organization ? ` · ${candidate.organization}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={assignMutation.isPending}
                    onClick={() => assignMutation.mutate(candidate.adminId)}
                  >
                    추가
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="col-span-2 flex flex-col rounded-lg border border-zinc-300 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-200 px-6 py-4">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={operators.length === 0}
            />
            <p className="body-regular-bold text-zinc-950">
              전체 <span className="text-primary">{operators.length}</span>
            </p>
          </div>

          {subAdminsQuery.isLoading ? (
            <p className="body-regular p-6 text-zinc-500">불러오는 중...</p>
          ) : null}

          {subAdminsQuery.isError ? (
            <p className="body-small p-6 text-error">{getApiErrorMessage(subAdminsQuery.error)}</p>
          ) : null}

          {!subAdminsQuery.isLoading && operators.length === 0 ? (
            <p className="body-regular p-6 text-zinc-500">등록된 운영자가 없습니다.</p>
          ) : null}

          {operators.length > 0 ? (
            <div className="flex flex-col divide-y divide-zinc-200">
              {operators.map((operator) => (
                <label
                  key={operator.adminId}
                  className="flex cursor-pointer items-center gap-3 px-6 py-4"
                >
                  <Checkbox
                    checked={selectedIds.has(operator.adminId)}
                    onCheckedChange={() => toggleOne(operator.adminId)}
                  />
                  <PersonIcon className="size-4 shrink-0 text-zinc-400" />
                  <p className="body-regular-bold text-zinc-950">
                    {operator.name}
                    <span className="body-small font-normal text-zinc-500">({operator.email})</span>
                  </p>
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
