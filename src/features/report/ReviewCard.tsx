import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { maskPersonName } from "@/lib/maskName";
import { cn } from "@/lib/utils";
import type { FestivalReviewItem } from "./types";

/**
 * 백엔드가 리뷰 작성자 대신 내려주는 고정 표시명.
 *
 * <p>지금 리포트 API는 작성자를 식별하지 않고 이 문구만 내려준다. 사람 이름이 아니라서
 * 가리면 「방*객」처럼 뜻 없는 글자가 되므로 마스킹에서 뺀다. 나중에 백엔드가 실제
 * 닉네임을 내려주기 시작하면 이 문구와 달라져 자동으로 마스킹된다.</p>
 */
const ANONYMOUS_DISPLAY_NAME = "방문객";

/** 화면에 보여 줄 작성자 이름. 실제 이름이면 가운데 글자를 가린다. */
export function toDisplayReviewerName(displayName: string): string {
  return displayName === ANONYMOUS_DISPLAY_NAME ? displayName : maskPersonName(displayName);
}

/** 별점 5개를 채움/빈 아이콘으로 표시한다. */
export function ReviewRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`5점 만점에 ${rating}점`}>
      {[1, 2, 3, 4, 5].map((score) =>
        score <= Math.round(rating) ? (
          <StarFilledIcon key={score} className="size-3 text-point-600" />
        ) : (
          <StarIcon key={score} className="size-3 text-zinc-300" />
        ),
      )}
    </div>
  );
}

/** 방문객 대표 리뷰 카드(이름 + 별점 + 본문). 전체 리뷰 모달에서도 같은 카드를 쓴다. */
export function ReviewCard({
  review,
  className,
}: {
  review: FestivalReviewItem;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg bg-zinc-50 p-4", className)}>
      <div className="flex flex-col gap-0.5">
        <span className="body-small text-zinc-950">
          {toDisplayReviewerName(review.displayName)} 님
        </span>
        {review.rating === null ? null : <ReviewRating rating={review.rating} />}
      </div>
      <p className="body-small text-zinc-600">{review.content}</p>
    </div>
  );
}
