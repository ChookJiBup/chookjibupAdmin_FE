"use client";

import { Header } from "@/components/layout/Header";
import { SignupKindSelect } from "@/features/auth/admin/SignupKindSelect";

export default function SignupPage() {
  return (
    <>
      <Header variant="signup" />
      <main className="bg-dimmed flex flex-1 flex-col items-center justify-center gap-2 p-8">
        <SignupKindSelect />
      </main>
    </>
  );
}
