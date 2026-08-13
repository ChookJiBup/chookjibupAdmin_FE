import type { ReactNode } from "react";

export interface FormSectionProps {
  label: string;
  children: ReactNode;
}

/** 그룹 라벨(왼쪽) + 필드 영역(오른쪽)을 좌우로 배치하는 카드 한 칸. */
export function FormSection({ label, children }: FormSectionProps) {
  return (
    <div className="flex min-w-0 items-start gap-6 rounded-lg border border-zinc-300 bg-white px-8 py-6">
      <p className="body-large-bold w-44 shrink-0 whitespace-nowrap text-zinc-950">{label}</p>
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}
