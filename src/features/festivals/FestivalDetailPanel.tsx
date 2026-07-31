"use client";

import { ImageIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";

/**
 * 축제 단건 조회 API가 아직 백엔드에 없어 임시로 사용하는 더미 데이터.
 * API가 준비되면 festivalId로 실제 조회한 값으로 교체한다.
 */
const MOCK_FESTIVAL_DETAIL = {
  name: "김천김밥축제",
  description: "너는 네 삶을 바꿔야 한다(You Must Change Your Life)\n매주 월요일 휴관",
  address: "전남광주통합특별시 북구 비엔날레로 111(용봉동)",
  addressDetail: "광주비엔날레 전시관",
  startDate: "2026.09.05",
  endDate: "2026.11.15",
};

export function FestivalDetailPanel() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        <div className="flex max-w-[460px] flex-1 flex-col gap-4 rounded-lg border border-zinc-300 px-8 py-6">
          <p className="body-large-bold text-zinc-950">축제 정보</p>

          <Input label="축제명" defaultValue={MOCK_FESTIVAL_DETAIL.name} />

          <div className="flex w-full flex-col gap-1">
            <label className="body-small-bold text-zinc-950">내용</label>
            <Textarea
              rows={3}
              defaultValue={MOCK_FESTIVAL_DETAIL.description}
              className="rounded-lg border-zinc-400 bg-white body-regular! text-zinc-950 focus-visible:border-primary focus-visible:ring-0"
            />
          </div>

          <div className="flex w-full flex-col gap-1">
            <label className="body-small-bold text-zinc-950">장소</label>
            <div className="flex flex-col gap-2">
              <Input disabled defaultValue={MOCK_FESTIVAL_DETAIL.address} />
              <Input defaultValue={MOCK_FESTIVAL_DETAIL.addressDetail} />
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              label="시작날짜"
              wrapperClassName="flex-1"
              defaultValue={MOCK_FESTIVAL_DETAIL.startDate}
            />
            <Input
              label="종료날짜"
              wrapperClassName="flex-1"
              defaultValue={MOCK_FESTIVAL_DETAIL.endDate}
            />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-lg bg-zinc-100">
          <ImageIcon className="size-16 text-zinc-400" />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(true)}>
          삭제하기
        </Button>
        {/* 축제 수정 API(PATCH)는 있지만 단건 조회 API가 없어 기존 값을 정확히 불러올 수 없다.
            지금은 화면만 구현하고, 실제 수정 동작은 조회 API가 생긴 뒤에 연결한다. */}
        <Button type="button" onClick={() => setEditDialogOpen(true)}>
          수정하기
        </Button>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="삭제하시겠습니까?"
        // 축제 삭제 API가 아직 없어 확인 후 실제 삭제는 이뤄지지 않는다.
        onConfirm={() => setDeleteDialogOpen(false)}
      />

      <ConfirmDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="축제를 수정하시겠습니까?"
        confirmLabel="수정"
        confirmVariant="primary"
        onConfirm={() => setEditDialogOpen(false)}
      />
    </div>
  );
}
