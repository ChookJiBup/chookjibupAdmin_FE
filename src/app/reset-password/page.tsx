"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { ResetPasswordCompletePanel } from "@/features/auth/admin/ResetPasswordCompletePanel";
import { ResetPasswordForm } from "@/features/auth/admin/ResetPasswordForm";

export default function ResetPasswordPage() {
  const [done, setDone] = useState(false);

  return (
    <>
      <Header variant="default" />
      <main className="bg-dimmed grid flex-1 grid-cols-3 items-center gap-6 p-8">
        <div className="col-start-2 flex justify-center">
          {done ? (
            <ResetPasswordCompletePanel />
          ) : (
            <ResetPasswordForm onComplete={() => setDone(true)} />
          )}
        </div>
      </main>
    </>
  );
}
