"use client";

import { IdCardIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getApiErrorMessage } from "@/lib/api/httpError";
import { useStaffAuthStore } from "@/store/staffAuthStore";
import { getStaffDashboard, updateBoothCongestion } from "./api";
import type { StaffCongestionLevel } from "./types";

const LEVEL_LABEL: Record<StaffCongestionLevel, string> = {
  LOW: "여유",
  MEDIUM: "보통",
  HIGH: "혼잡",
};

export function StaffDashboardPanel() {
  const session = useStaffAuthStore((state) => state.session);
  const queryClient = useQueryClient();
  const [editingBoothId, setEditingBoothId] = useState<number | null>(null);
  const [waitMinutes, setWaitMinutes] = useState("0");
  const [congestionLevel, setCongestionLevel] = useState<StaffCongestionLevel>("LOW");
  const festivalId = session?.festivalId ?? "";
  const dashboardQuery = useQuery({
    queryKey: ["staff-dashboard", festivalId],
    queryFn: () => getStaffDashboard(festivalId),
    enabled: Boolean(session),
  });
  const updateMutation = useMutation({
    mutationFn: ({ boothId }: { boothId: number }) =>
      updateBoothCongestion(festivalId, boothId, {
        waitMinutes: Number(waitMinutes),
        congestionLevel,
      }),
    onSuccess: () => {
      setEditingBoothId(null);
      queryClient.invalidateQueries({ queryKey: ["staff-dashboard", festivalId] });
    },
  });

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-5 flex items-center gap-2">
          <IdCardIcon className="size-5 text-primary" />
          <h2 className="heading-small">내 근무 정보</h2>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="body-small text-zinc-500">이름</dt>
            <dd className="body-regular-bold mt-1">{session.name}</dd>
          </div>
          <div>
            <dt className="body-small text-zinc-500">로그인 아이디</dt>
            <dd className="body-regular-bold mt-1">{session.loginId}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="body-small text-zinc-500">담당 축제 코드</dt>
            <dd className="body-small mt-1 break-all text-zinc-950">{festivalId}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="heading-small mb-3">부스 혼잡도 관리</h2>
        {dashboardQuery.isLoading ? (
          <p className="body-small text-zinc-500">부스를 불러오는 중...</p>
        ) : null}
        {dashboardQuery.isError ? (
          <p className="body-small text-error">
            {getApiErrorMessage(dashboardQuery.error, "부스 정보를 불러오지 못했습니다.")}
          </p>
        ) : null}
        {dashboardQuery.data?.booths.length === 0 ? (
          <p className="body-small rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-500">
            승인된 부스가 없습니다.
          </p>
        ) : null}
        <div className="grid gap-3">
          {dashboardQuery.data?.booths.map((booth) => (
            <article
              key={booth.boothId}
              className="rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="body-regular-bold">{booth.boothName}</h3>
                  <p className="body-small mt-1 text-zinc-500">
                    {booth.congestionLevel ? LEVEL_LABEL[booth.congestionLevel] : "미입력"} · 대기{" "}
                    {booth.waitMinutes ?? 0}분
                  </p>
                </div>
                <button
                  type="button"
                  className="body-small-bold rounded-lg bg-primary px-4 py-2 text-white"
                  onClick={() => {
                    setEditingBoothId(booth.boothId);
                    setWaitMinutes(String(booth.waitMinutes ?? 0));
                    setCongestionLevel(booth.congestionLevel ?? "LOW");
                  }}
                >
                  갱신하기
                </button>
              </div>
              {editingBoothId === booth.boothId ? (
                <form
                  className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateMutation.mutate({ boothId: booth.boothId });
                  }}
                >
                  <label className="body-small">
                    혼잡도
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                      value={congestionLevel}
                      onChange={(event) =>
                        setCongestionLevel(event.target.value as StaffCongestionLevel)
                      }
                    >
                      <option value="LOW">여유</option>
                      <option value="MEDIUM">보통</option>
                      <option value="HIGH">혼잡</option>
                    </select>
                  </label>
                  <label className="body-small">
                    대기시간(분)
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
                      type="number"
                      min="0"
                      required
                      value={waitMinutes}
                      onChange={(event) => setWaitMinutes(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="body-small-bold self-end rounded-lg bg-zinc-950 px-4 py-2 text-white"
                  >
                    저장
                  </button>
                  {updateMutation.isError ? (
                    <p className="body-caption text-error sm:col-span-3">
                      {getApiErrorMessage(updateMutation.error, "혼잡도를 저장하지 못했습니다.")}
                    </p>
                  ) : null}
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
