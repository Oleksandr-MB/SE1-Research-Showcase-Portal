import { Suspense } from "react";
import VerifyEmailPageClient from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--LightGray)]" />}>
      <VerifyEmailPageClient />
    </Suspense>
  );
}

