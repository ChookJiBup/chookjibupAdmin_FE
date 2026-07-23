"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { getSubAdmins, searchSubAdminCandidates } from "./api";
import type { AdminStatus } from "./types";

const STATUS_LABEL: Record<AdminStatus, string> = {
  ACTIVE: "활성",
  SUSPENDED: "정지",
  DELETED: "탈퇴",
};

export function OperatorsPanel({ festivalId }: { festivalId: string }) {
  const [keywordInput, setKeywordInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState<string | null>(null);

  const subAdminsQuery = useQuery({
    queryKey: ["sub-admins", festivalId],
    queryFn: () => getSubAdmins(festivalId),
  });

  const candidatesQuery = useQuery({
    queryKey: ["sub-admin-candidates", festivalId, searchKeyword],
    queryFn: () => searchSubAdminCandidates(festivalId, searchKeyword ?? ""),
    enabled: searchKeyword !== null && searchKeyword.length > 0,
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="body-regular-bold">등록된 운영자</h2>

        {subAdminsQuery.isLoading && <p className="body-regular text-gray-500">불러오는 중...</p>}

        {subAdminsQuery.isError && (
          <p className="body-small text-error">{getApiErrorMessage(subAdminsQuery.error)}</p>
        )}

        {subAdminsQuery.data && subAdminsQuery.data.length === 0 && (
          <p className="body-regular text-gray-500">등록된 운영자가 없습니다.</p>
        )}

        {subAdminsQuery.data && subAdminsQuery.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {subAdminsQuery.data.map((subAdmin) => (
              <li
                key={subAdmin.adminId}
                className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="body-regular-bold">{subAdmin.name}</p>
                  <p className="body-small text-gray-500">
                    {subAdmin.email} · {subAdmin.organization} · {STATUS_LABEL[subAdmin.status]}
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="body-small rounded-lg border px-3 py-1.5 opacity-50"
                >
                  삭제 (미구현)
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="body-regular-bold">운영자 추가</h2>
        <p className="body-small text-gray-400">
          이미 회원가입한 관리자 계정을 이메일/이름으로 검색해 초대합니다. (초대 실행은 아직 미구현)
        </p>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearchKeyword(keywordInput.trim());
          }}
        >
          <input
            type="text"
            placeholder="이메일 또는 이름으로 검색"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            className="body-regular flex-1 rounded-lg border px-3 py-2"
          />
          <button type="submit" className="body-regular-bold rounded-lg border px-4 py-2">
            검색
          </button>
        </form>

        {candidatesQuery.isLoading && <p className="body-regular text-gray-500">검색 중...</p>}

        {candidatesQuery.isError && (
          <p className="body-small text-error">{getApiErrorMessage(candidatesQuery.error)}</p>
        )}

        {candidatesQuery.data && candidatesQuery.data.length === 0 && (
          <p className="body-regular text-gray-500">검색 결과가 없습니다.</p>
        )}

        {candidatesQuery.data && candidatesQuery.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {candidatesQuery.data.map((candidate) => (
              <li
                key={candidate.adminId}
                className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="body-regular-bold">{candidate.name}</p>
                  <p className="body-small text-gray-500">
                    {candidate.email} · {candidate.organization}
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="body-small rounded-lg border px-3 py-1.5 opacity-50"
                >
                  초대 (미구현)
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
