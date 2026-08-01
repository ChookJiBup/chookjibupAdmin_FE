"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { AiSuggestion } from "./types";

/** AI 제안이 있을 때 토스트로 노출한다(스택 가능). 실시간 구독 API가 아직 없어 마운트 시 1회 노출한다. */
export function AiSuggestionToasts({ suggestions }: { suggestions: AiSuggestion[] }) {
  useEffect(() => {
    suggestions.forEach((suggestion) => {
      toast.warning(suggestion.title, {
        id: suggestion.id,
        description: suggestion.description,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
