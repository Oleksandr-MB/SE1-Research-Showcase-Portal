"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/api";

export default function LogoutPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you out...");

  useEffect(() => {
    let isMounted = true;

    const performLogout = async () => {
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("rsp_token")
          : null;

      if (!token) {
        if (isMounted) {
          setMessage("No active session. Redirecting to login...");
        }
        router.replace("/login");
        return;
      }

      try {
        await logoutUser(token);
        if (isMounted) {
          setMessage("Signed out. Redirecting to login...");
        }
      } catch (error) {
        console.error("Logout failed", error);
        if (isMounted) {
          setMessage("Session already ended. Redirecting to login...");
        }
      } finally {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("rsp_token");
        }
        router.replace("/login");
      }
    };

    performLogout();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface_muted)] px-4 text-center text-[var(--muted_text)]">
      <div className="shadow-soft-md w-full max-w-md rounded-3xl border border-[var(--border_on_white)] bg-[var(--surface_primary)] p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary_accent)]">
          Signing out
        </p>
        <p className="mt-3 text-lg text-[var(--titles)]">{message}</p>
        <p className="mt-4 text-sm text-[var(--muted_text)]">
          You will be redirected shortly. If nothing happens,{" "}
          <button
            onClick={() => router.replace("/login")}
            className="font-semibold text-[var(--primary_accent)] underline hover:text-[var(--titles)]"
          >
            continue to login
          </button>
          .
        </p>
      </div>
    </div>
  );
}
