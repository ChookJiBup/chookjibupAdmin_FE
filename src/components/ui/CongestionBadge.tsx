import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CongestionLevel } from "@/features/dashboard/types";

const CONGESTION_BADGE_BASE_CLASSES = "h-auto rounded-md px-2 py-1 text-xs font-normal";

const CONGESTION_LABEL: Record<CongestionLevel, string> = {
  LOW: "여유",
  MEDIUM: "보통",
  HIGH: "혼잡",
};

const CONGESTION_CLASSES: Record<CongestionLevel, string> = {
  LOW: "bg-secondary-600 text-white hover:bg-secondary-600",
  MEDIUM: "bg-point-500 text-white hover:bg-point-500",
  HIGH: "bg-red-600 text-white hover:bg-red-600",
};

export function CongestionBadge({
  level,
  className,
}: {
  level: CongestionLevel;
  className?: string;
}) {
  return (
    <Badge className={cn(CONGESTION_BADGE_BASE_CLASSES, CONGESTION_CLASSES[level], className)}>
      {CONGESTION_LABEL[level]}
    </Badge>
  );
}
