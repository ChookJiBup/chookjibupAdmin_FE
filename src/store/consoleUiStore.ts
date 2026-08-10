import { create } from "zustand";

interface ConsoleUiState {
  /** true면 콘솔 상단 Nav 탭 줄을 숨긴다(예: 방문인원 입력/분석 중 화면). */
  hideNav: boolean;
  setHideNav: (hideNav: boolean) => void;
  /** true면 콘텐츠 영역의 좌우/상하 여백을 없애 화면 전체를 채운다(예: 대시보드 지도). */
  fullBleed: boolean;
  setFullBleed: (fullBleed: boolean) => void;
}

export const useConsoleUiStore = create<ConsoleUiState>((set) => ({
  hideNav: false,
  setHideNav: (hideNav) => set({ hideNav }),
  fullBleed: false,
  setFullBleed: (fullBleed) => set({ fullBleed }),
}));
