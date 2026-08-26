import { CompleteDialog } from "@/components/ui/CompleteDialog";
import type { AccountKind } from "./types";

export function SignupCompletePanel({ accountKind }: { accountKind: AccountKind }) {
  const isGovernment = accountKind === "GOVERNMENT";

  return (
    <CompleteDialog
      title="회원가입 완료"
      description={
        isGovernment ? (
          <>
            축제를 등록하고
            <br />
            축지법으로 운영을 시작해 보세요
          </>
        ) : (
          <>
            축제 총괄이 운영자로 초대하면
            <br />
            해당 축제를 관리할 수 있습니다
          </>
        )
      }
      actionLabel="시작하기"
      actionHref="/login"
    />
  );
}
