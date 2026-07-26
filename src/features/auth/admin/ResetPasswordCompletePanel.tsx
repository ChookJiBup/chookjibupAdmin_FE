import { CompleteDialog } from "@/components/ui/CompleteDialog";

export function ResetPasswordCompletePanel() {
  return (
    <CompleteDialog
      title="비밀번호 변경 완료"
      description={
        <>
          새로운 비밀번호가 설정되었습니다.
          <br />
          로그인된 모든 기기에서 로그아웃됩니다.
        </>
      }
      actionLabel="로그인하기"
      actionHref="/"
    />
  );
}
