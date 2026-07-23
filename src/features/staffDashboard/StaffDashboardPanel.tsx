"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getMockBoothCongestion, mockUpdateQueueTail } from "./mockData";
import type { CongestionLevel } from "./types";

const CONGESTION_LABEL: Record<CongestionLevel, string> = {
  LOW: "여유",
  MEDIUM: "보통",
  HIGH: "혼잡",
};

const CONGESTION_COLOR: Record<CongestionLevel, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-zinc-700",
  HIGH: "text-error",
};

function BoothRow({
  boothId,
  boothName,
  congestionLevel,
  initialDistance,
}: {
  boothId: string;
  boothName: string;
  congestionLevel: CongestionLevel;
  initialDistance: number;
}) {
  const [distance, setDistance] = useState(initialDistance);
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => mockUpdateQueueTail(boothId, distance),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  return (
    <li className="flex flex-col gap-2 rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="body-regular-bold">{boothName}</p>
        <span className={`body-small ${CONGESTION_COLOR[congestionLevel]}`}>
          {CONGESTION_LABEL[congestionLevel]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <label className="body-small flex flex-1 items-center gap-2 text-gray-500">
          줄 끝 위치 (부스 앞 m)
          <input
            type="number"
            min={0}
            value={distance}
            onChange={(event) => setDistance(Number(event.target.value))}
            className="body-regular w-20 rounded-lg border px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="body-small rounded-lg border px-3 py-1.5 disabled:opacity-50"
        >
          {updateMutation.isPending ? "저장 중..." : saved ? "저장됨" : "저장"}
        </button>
      </div>
    </li>
  );
}

export function StaffDashboardPanel() {
  const [booths] = useState(getMockBoothCongestion);

  return (
    <div className="flex flex-col gap-3">
      <p className="body-small text-gray-400">
        아직 목업 데이터입니다. 백엔드 혼잡도/줄끝라인 API가 준비되면 실제 데이터로 교체합니다.
      </p>
      <ul className="flex flex-col gap-2">
        {booths.map((booth) => (
          <BoothRow
            key={booth.boothId}
            boothId={booth.boothId}
            boothName={booth.boothName}
            congestionLevel={booth.congestionLevel}
            initialDistance={booth.queueTailDistanceMeters}
          />
        ))}
      </ul>
    </div>
  );
}
