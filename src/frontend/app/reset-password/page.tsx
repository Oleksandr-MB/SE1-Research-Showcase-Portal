import { Suspense } from "react";
import ResetPasswordPageClient from "./reset-password-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--LightGray)]" />}>
      <ResetPasswordPageClient />
    </Suspense>
  );
}

