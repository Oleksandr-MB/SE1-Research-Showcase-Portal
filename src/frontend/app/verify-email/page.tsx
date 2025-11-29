"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyEmailToken } from "@/lib/api";

type VerifyState = "checking" | "success" | "error" | "missing";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>("checking");
  const [message, setMessage] = useState("Verifying your email address...");
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (!token) {
      setState("missing");
      setMessage("We could not find a verification token in this link.");
      return;
    }

    const runVerification = async () => {
      try {
        const response = await verifyEmailToken(token);
        setState("success");
        setMessage(response.message || "Email verified successfully!");
      } catch (error) {
        setState("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify your email at the moment.",
        );
      }
    };

    runVerification();
  }, [token]);

  useEffect(() => {
    if (state !== "success") {
      return;
    }

    setCountdown(4);
    const tick = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : prev));
    }, 1000);

    const redirect = setTimeout(() => {
      router.replace("/login?verified=1");
    }, 4000);

    return () => {
      clearInterval(tick);
      clearTimeout(redirect);
    };
  }, [router, state]);

  const headingMap: Record<VerifyState, string> = {
    checking: "Verifying your email",
    success: "You're verified!",
    error: "Something went wrong",
    missing: "Link incomplete",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface_muted)] px-4 text-[var(--normal_text)]">
      <div className="shadow-soft-md w-full max-w-md rounded-3xl border border-[var(--border_on_white)] bg-[var(--surface_primary)] p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary_accent)]">
          Email verification
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--titles)]">
          {headingMap[state]}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted_text)]">{message}</p>

        {state === "success" && (
          <p className="mt-2 text-xs text-[var(--muted_text_soft)]">
            Redirecting to sign in in {countdown}s...
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 text-sm">
          <button
            type="button"
            className="rounded-2xl border border-[var(--primary_accent)] px-4 py-3 font-semibold text-[var(--primary_accent)] transition-colors hover:border-[var(--titles)] hover:text-[var(--titles)]"
            onClick={() => router.push("/login")}
          >
            Go to sign in
          </button>
          {state !== "success" && (
            <button
              type="button"
              className="rounded-2xl border border-[var(--border_on_surface_soft)] px-4 py-3 text-[var(--muted_text)] transition-colors hover:text-[var(--titles)]"
              onClick={() => router.push("/register")}
            >
              Need a new link? Register again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
