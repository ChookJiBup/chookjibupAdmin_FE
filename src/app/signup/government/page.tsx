"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { SignupCompletePanel } from "@/features/auth/admin/SignupCompletePanel";
import { SignupForm } from "@/features/auth/admin/SignupForm";

export default function GovernmentSignupPage() {
  const [done, setDone] = useState(false);
  const [completedKind, setCompletedKind] = useState<"GOVERNMENT" | "CONTRACTOR">("GOVERNMENT");

  return (
    <>
      <Header variant="signup" />
      <main className="bg-dimmed flex flex-1 flex-col items-center justify-center gap-2 p-8">
        {done ? (
          <SignupCompletePanel accountKind={completedKind} />
        ) : (
          <SignupForm
            initialAccountKind="GOVERNMENT"
            onComplete={(accountKind) => {
              setCompletedKind(accountKind);
              setDone(true);
            }}
          />
        )}
      </main>
    </>
  );
}
