"use client";

import { useState } from "react";
import { MapNoticeCard } from "@/components/map/MapNoticeCard";

/** 부스맵 에디터 화면 좌상단에 뜨는 dismissible 안내 배너(Figma "toast"). */
export function BoothMapGuideBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <MapNoticeCard
      title="축제부스지도 수정"
      description="우측 리스트/지도상의 핀/모달을 선택해 상세 정보를 편집할 수 있습니다."
      onClose={() => setOpen(false)}
    />
  );
}
