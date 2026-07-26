import { CompleteDialog } from "@/components/ui/CompleteDialog";

export function SignupCompletePanel() {
  return (
    <CompleteDialog
      title="회원가입 완료"
      description={
        <>
          축제의 모든 순간에
          <br />
          축지법을 사용해 보세요
        </>
      }
      actionLabel="시작하기"
      actionHref="/"
    />
  );
}
