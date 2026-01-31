import { Suspense } from "react";
import MePageClient from "./me-client";

export default function MePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--LightGray)]" />}>
      <MePageClient />
    </Suspense>
  );
}

