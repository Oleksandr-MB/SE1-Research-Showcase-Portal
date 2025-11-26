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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-600">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Signing out
        </p>
        <p className="mt-3 text-lg">{message}</p>
        <p className="mt-4 text-sm text-slate-500">
          You will be redirected shortly. If nothing happens,{" "}
          <button
            onClick={() => router.replace("/login")}
            className="font-semibold text-indigo-600 underline"
          >
            continue to login
          </button>
          .
        </p>
      </div>
    </div>
  );
}
