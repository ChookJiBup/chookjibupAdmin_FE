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
      <main className="bg-dimmed grid flex-1 grid-cols-3 items-center gap-6 p-8">
        <div className="col-start-2 flex justify-center">
          {done ? <SignupCompletePanel /> : <SignupForm onComplete={() => setDone(true)} />}
        </div>
      </main>
    </>
  );
}
