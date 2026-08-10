import { Header } from "@/components/layout/Header";
import { ForgotPasswordForm } from "@/features/auth/admin/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <Header variant="default" />
      <main className="bg-dimmed grid flex-1 grid-cols-3 items-center gap-6 p-8">
        <div className="col-start-2 flex justify-center">
          <ForgotPasswordForm />
        </div>
      </main>
    </>
  );
}
