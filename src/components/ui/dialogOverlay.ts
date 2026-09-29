/**
 * 모달 딤 오버레이 공통 클래스.
 *
 * 모달이 열리면 헤더·본문·푸터를 포함한 화면 전체의 배경 조작을 막는다.
 * 모든 모달이 같은 범위를 사용하도록 공통 클래스에서 전체 화면을 지정한다.
 */
export const DIALOG_OVERLAY_CLASSES = "fixed inset-0 z-[1000] bg-dimmed";

/** 기존 전체 화면 모달에서도 같은 공통 정책을 사용한다. */
export const FULL_SCREEN_DIALOG_OVERLAY_CLASSES = DIALOG_OVERLAY_CLASSES;
