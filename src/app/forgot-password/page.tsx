import { Header } from "@/components/layout/Header";
import { ForgotPasswordForm } from "@/features/auth/admin/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <Header variant="default" />
      <main className="bg-dimmed flex flex-1 items-center justify-center p-8">
        <ForgotPasswordForm />
      </main>
    </>
  );
}
