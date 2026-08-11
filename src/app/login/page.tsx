import { Header } from "@/components/layout/Header";
import { LoginForm } from "@/features/auth/admin/LoginForm";

export default function LoginPage() {
  return (
    <>
      <Header variant="default" />
      <main className="bg-dimmed flex flex-1 items-center justify-center p-8">
        <LoginForm />
      </main>
    </>
  );
}
