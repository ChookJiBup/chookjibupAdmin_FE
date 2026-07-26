"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { SignupCompletePanel } from "@/features/auth/admin/SignupCompletePanel";
import { SignupForm } from "@/features/auth/admin/SignupForm";

export default function SignupPage() {
  const [done, setDone] = useState(false);

  return (
    <>
      <Header variant="signup" />
      <main className="bg-dimmed flex flex-1 flex-col items-center justify-center gap-2 p-8">
        {done ? <SignupCompletePanel /> : <SignupForm onComplete={() => setDone(true)} />}
      </main>
    </>
  );
}
