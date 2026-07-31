import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_BADGE_BASE_CLASSES = "h-auto rounded-md px-2 py-1 text-xs font-normal";

/** 총괄관리자(FESTIVAL_OWNER) 역할 뱃지. */
export function FestivalOwnerBadge({ className }: { className?: string }) {
  return <Badge className={cn(ROLE_BADGE_BASE_CLASSES, className)}>총괄관리자</Badge>;
}

/** 운영자(SUB_ADMIN) 역할 뱃지. */
export function OperatorBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        ROLE_BADGE_BASE_CLASSES,
        "bg-secondary-600 text-white hover:bg-secondary-600",
        className,
      )}
    >
      운영자
    </Badge>
  );
}
