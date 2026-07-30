import { CalendarIcon, DotFilledIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { MOCK_FESTIVALS } from "./mockFestivals";
import type { FestivalProgressStatus, FestivalSummary } from "./types";

const REGISTER_CTA_CLASSES =
  "inline-flex items-center justify-center gap-2.5 rounded-md bg-primary px-4 py-2 body-regular text-white transition-colors hover:bg-secondary";

const STATUS_ORDER: FestivalProgressStatus[] = ["UPCOMING", "ONGOING", "COMPLETED"];

const STATUS_LABEL: Record<FestivalProgressStatus, string> = {
  UPCOMING: "진행 예정",
  ONGOING: "진행중",
  COMPLETED: "진행 완료",
};

const STATUS_HEADER_STYLES: Record<FestivalProgressStatus, string> = {
  UPCOMING: "bg-zinc-100",
  ONGOING: "bg-orange-100",
  COMPLETED: "bg-blue-100",
};

const STATUS_BODY_BORDER_STYLES: Record<FestivalProgressStatus, string> = {
  UPCOMING: "divide-zinc-200 border-zinc-200",
  ONGOING: "divide-orange-500 border-orange-500",
  COMPLETED: "divide-blue-500 border-blue-500",
};

function formatFestivalDateRange(startDate: string, endDate: string) {
  const format = (date: string) => {
    const [year, month, day] = date.split("-").map(Number);
    return `${year}년 ${month}월 ${day}일`;
  };
  return `${format(startDate)}- ${format(endDate)}`;
}

/** 역할에 따라 축제 카드 클릭 시 이동할 경로. 총괄관리자는 축제관리, 운영자는 대시보드로 간다. */
function getFestivalHref(festival: FestivalSummary) {
  return festival.role === "FESTIVAL_OWNER"
    ? `/console/festivals/${festival.festivalId}`
    : `/console/festivals/${festival.festivalId}/dashboard`;
}

function FestivalCard({ festival }: { festival: FestivalSummary }) {
  return (
    <Link
      href={getFestivalHref(festival)}
      className="flex w-full flex-col gap-2 px-5 py-4 transition-colors hover:bg-zinc-50"
    >
      <div className="flex items-start gap-2">
        <p className="body-regular-bold text-zinc-950">{festival.name}</p>
        <Badge
          variant={festival.role === "FESTIVAL_OWNER" ? "default" : "secondary"}
          className="h-auto rounded-md px-2 py-1 text-xs font-normal"
        >
          {festival.role === "FESTIVAL_OWNER" ? "총괄관리자" : "운영자"}
        </Badge>
      </div>
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 shrink-0 text-zinc-600" />
          <p className="body-small text-zinc-600">
            {formatFestivalDateRange(festival.startDate, festival.endDate)}
          </p>
        </div>
        {festival.status === "UPCOMING" && festival.dDayLabel && (
          <Badge className="h-auto gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-normal text-zinc-950">
            <DotFilledIcon className="size-4" />
            {festival.dDayLabel}
          </Badge>
        )}
      </div>
    </Link>
  );
}

function StatusColumn({
  status,
  festivals,
}: {
  status: FestivalProgressStatus;
  festivals: FestivalSummary[];
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div
        className={`heading-small flex gap-2 rounded-lg p-5 text-zinc-950 ${STATUS_HEADER_STYLES[status]}`}
      >
        <p>{STATUS_LABEL[status]}</p>
        <p>{festivals.length}</p>
      </div>
      {festivals.length > 0 && (
        <div
          className={`flex flex-col divide-y rounded-lg border ${STATUS_BODY_BORDER_STYLES[status]}`}
        >
          {festivals.map((festival) => (
            <FestivalCard key={festival.festivalId} festival={festival} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeFestivalBoard() {
  if (MOCK_FESTIVALS.length === 0) {
    return (
      <Empty className="min-h-[480px] rounded-none border-none p-0">
        <EmptyHeader>
          <EmptyTitle className="body-regular-bold text-zinc-950">
            등록된 축제가 없습니다
          </EmptyTitle>
          <EmptyDescription className="body-regular text-zinc-500">
            축제를 등록하고 관리해 보세요!
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/console/festivals/new" className={REGISTER_CTA_CLASSES}>
            축제 등록하기
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  const festivalsByStatus = STATUS_ORDER.map((status) => ({
    status,
    festivals: MOCK_FESTIVALS.filter((festival) => festival.status === status),
  }));

  return (
    <div className="grid items-start gap-6 md:grid-cols-3">
      {festivalsByStatus.map(({ status, festivals }) => (
        <StatusColumn key={status} status={status} festivals={festivals} />
      ))}
    </div>
  );
}
