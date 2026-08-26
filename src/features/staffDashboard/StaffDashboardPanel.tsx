"use client";

import { ExclamationTriangleIcon, IdCardIcon } from "@radix-ui/react-icons";
import { useStaffAuthStore } from "@/store/staffAuthStore";
import type { UnsupportedStaffFeature } from "./types";

const UNSUPPORTED_FEATURES: UnsupportedStaffFeature[] = [
  {
    title: "담당 부스",
    description: "담당 부스 조회 API가 준비되면 이곳에 표시됩니다.",
  },
  {
    title: "실시간 혼잡도",
    description: "혼잡도 조회 API가 아직 제공되지 않습니다.",
  },
  {
    title: "줄 끝 위치 수정",
    description: "줄 끝 좌표 조회·수정 API가 아직 제공되지 않습니다.",
  },
];

export function StaffDashboardPanel() {
  const session = useStaffAuthStore((state) => state.session);

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
            <dd className="body-small mt-1 break-all text-zinc-950">{session.festivalId}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="heading-small mb-3">현장 운영</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {UNSUPPORTED_FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="size-4 text-point-600" />
                <h3 className="body-regular-bold">{feature.title}</h3>
              </div>
              <p className="body-small mt-3 text-zinc-500">{feature.description}</p>
              <span className="body-caption mt-4 inline-flex rounded-md bg-zinc-100 px-2 py-1 text-zinc-500">
                준비 중
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
