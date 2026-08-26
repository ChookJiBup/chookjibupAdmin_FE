"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ResetPasswordCompletePanel } from "@/features/auth/admin/ResetPasswordCompletePanel";
import { ResetPasswordForm } from "@/features/auth/admin/ResetPasswordForm";
import { useAdminAuthStore } from "@/store/adminAuthStore";

export default function ResetPasswordPage() {
  const [done, setDone] = useState(false);
  const admin = useAdminAuthStore((state) => state.session?.admin);

  return (
    <>
      <Header
        variant={admin ? "login" : "default"}
        href={admin ? "/console" : "/"}
        userName={admin?.name}
      />
      <main className="bg-dimmed flex flex-1 items-center justify-center p-8">
        {done ? (
          <ResetPasswordCompletePanel />
        ) : (
          <ResetPasswordForm onComplete={() => setDone(true)} />
        )}
      </main>
    </>
  );
}
