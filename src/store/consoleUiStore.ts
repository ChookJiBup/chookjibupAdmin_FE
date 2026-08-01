import { create } from "zustand";

interface ConsoleUiState {
  /** true면 콘솔 상단 Nav 탭 줄을 숨긴다(예: 방문인원 입력/분석 중 화면). */
  hideNav: boolean;
  setHideNav: (hideNav: boolean) => void;
}

export const useConsoleUiStore = create<ConsoleUiState>((set) => ({
  hideNav: false,
  setHideNav: (hideNav) => set({ hideNav }),
}));
