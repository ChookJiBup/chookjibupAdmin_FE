"use client";

import { PersonIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Bottombar } from "@/components/ui/Bottombar";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { assignSubAdmin, deleteSubAdmins, getSubAdmins, searchSubAdminCandidates } from "./api";

export function OperatorsPanel({ festivalId }: { festivalId: string }) {
  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
  const normalizedSearchKeyword = searchKeyword?.trim().toLowerCase() ?? "";
  const isEmailSearch = normalizedSearchKeyword.includes("@");
  const candidates = (candidatesQuery.data ?? []).filter((candidate) => {
    if (addedIds.has(candidate.adminId)) return false;
    return !isEmailSearch || candidate.email.toLowerCase() === normalizedSearchKeyword;
  });

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
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sub-admins", festivalId] });
    },
  });

  return (
    <div className="col-span-3">
      <div className="grid min-h-[calc(100vh-250px)] grid-cols-3 items-stretch gap-6">
        <section className="col-span-1 flex min-w-0 flex-col gap-4 rounded-lg border border-zinc-300 bg-white px-8 py-6">
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
            <Button type="submit">검색</Button>
          </form>

          {candidatesQuery.isLoading ? (
            <p className="body-small text-zinc-500">검색 중...</p>
          ) : null}

          {candidatesQuery.isError ? (
            <p className="body-small text-error">{getApiErrorMessage(candidatesQuery.error)}</p>
          ) : null}

          {searchKeyword === null ? (
            <div className="rounded-lg bg-zinc-50 px-4 py-3">
              <p className="body-small-bold text-zinc-950">
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
                    <p className="body-small-bold text-zinc-950">
                      {candidate.name}({candidate.email})
                    </p>
                    <p className="body-small text-zinc-950">{candidate.organization ?? "-"}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={assignMutation.isPending}
                    onClick={() => assignMutation.mutate(candidate.adminId)}
                  >
                    추가
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="col-span-2 flex min-w-0 flex-col rounded-lg border border-zinc-300 bg-white px-8 py-6">
          <div className="flex items-center gap-3 pb-4">
            <Checkbox
              className="border border-zinc-200"
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={operators.length === 0}
            />
            <p className="body-large-bold text-zinc-950">
              전체 <span className="text-primary">{operators.length}</span>
            </p>
          </div>

          {subAdminsQuery.isLoading ? (
            <p className="body-regular py-4 text-zinc-500">불러오는 중...</p>
          ) : null}

          {subAdminsQuery.isError ? (
            <p className="body-small py-4 text-error">{getApiErrorMessage(subAdminsQuery.error)}</p>
          ) : null}

          {!subAdminsQuery.isLoading && operators.length === 0 ? (
            <p className="body-regular py-4 text-zinc-500">등록된 운영자가 없습니다.</p>
          ) : null}

          {operators.length > 0 ? (
            <div className="flex flex-col divide-y divide-zinc-200">
              {operators.map((operator) => (
                <label
                  key={operator.adminId}
                  className="flex cursor-pointer items-center gap-2 py-4"
                >
                  <Checkbox
                    className="border border-zinc-200"
                    checked={selectedIds.has(operator.adminId)}
                    onCheckedChange={() => toggleOne(operator.adminId)}
                  />
                  <div className="flex items-center gap-1">
                    <PersonIcon className="size-4 shrink-0 text-primary" />
                    <p className="body-regular text-zinc-950">
                      {operator.name}({operator.email})
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {selectedIds.size > 0 ? (
        <Bottombar
          type="selected"
          count={selectedIds.size}
          deleteDisabled={deleteMutation.isPending}
          onDelete={() => setDeleteDialogOpen(true)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="선택한 운영자를 삭제하시겠습니까?"
        description="삭제한 운영자는 이 축제를 더 이상 관리할 수 없습니다."
        onConfirm={() => deleteMutation.mutate([...selectedIds])}
        confirmPending={deleteMutation.isPending}
      />
    </div>
  );
}
