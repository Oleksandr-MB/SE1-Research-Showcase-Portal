"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { verifyEmailToken } from "@/lib/api";
import { UserIcon } from "@/components/icons";

type VerifyState = "checking" | "success" | "error" | "missing";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerifyState>("checking");
  const [message, setMessage] = useState("Verifying your email address...");
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isCancelled = false;

    const runVerification = async () => {
      try {
        const response = await verifyEmailToken(token);
        if (isCancelled) {
          return;
        }

        setCountdown(4);
        setStatus("success");
        setMessage(response.message || "Email verified successfully!");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify your email at the moment.",
        );
      }
    };

    runVerification();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }

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
  }, [router, status]);

  const headingMap: Record<VerifyState, string> = {
    checking: "Verifying your email",
    success: "You're verified!",
    error: "Something went wrong",
    missing: "Link incomplete",
  };
  const missingTokenMessage =
    "We could not find a verification token in this link.";
  const displayState: VerifyState = token ? status : "missing";
  const displayMessage = token ? message : missingTokenMessage;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--LightGray)] px-4 text-[var(--DarkGray)]">
        <div className="w-full max-w-md rounded-3xl border border-[var(--LightGray)] bg-[var(--White)] p-8 text-center shadow-soft-md">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--LightGray)] text-[var(--DarkGray)]">
          <UserIcon className="h-6 w-6" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--Gray)]">
          Email verification
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--DarkGray)]">
          {headingMap[displayState]}
        </h1>
        <p className="mt-3 text-sm text-[var(--Gray)]">{displayMessage}</p>

        {displayState === "success" && (
          <p className="mt-2 text-xs text-[var(--Gray)]">
            Redirecting to sign in in {countdown}s...
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 text-sm">
          <button
            type="button"
            className="rounded-2xl border border-[var(--DarkGray)] px-4 py-3 font-semibold text-[var(--DarkGray)] transition-all duration-200 hover:bg-[var(--DarkGray)] hover:text-[var(--White)]"
            onClick={() => router.push("/login")}
          >
            Go to sign in
          </button>
          {displayState !== "success" && (
            <button
              type="button"
              className="rounded-2xl border border-[var(--LightGray)] px-4 py-3 text-[var(--Gray)] transition-colors duration-200 hover:border-[var(--DarkGray)] hover:text-[var(--DarkGray)]"
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
